#!/usr/bin/env node

/**
 * E2E 実APIテストの入口スクリプト。
 *
 * 通常開発用の backend (`api`) は触らず、E2E 専用 backend (`api-e2e`) を
 * `tasche_test` に接続した状態で起動する。テスト開始前に migration、DB reset、
 * seed を必ず実行し、Playwright 終了後は `api-e2e` を停止する。
 */

import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, "..")
const projectRoot = path.resolve(frontendRoot, "../..")
const backendRoot = path.resolve(projectRoot, "packages/backend")
const frontendEnv = readEnvFile(path.join(frontendRoot, ".env"))
const backendEnv = readEnvFile(path.join(backendRoot, ".env"))
const e2eApiBaseUrl =
  process.env.E2E_API_BASE_URL ??
  frontendEnv.E2E_API_BASE_URL ??
  `http://localhost:${backendEnv.E2E_API_CONTAINER_PORT ?? "8001"}`

let exitStatus = 1

console.log("Starting E2E backend on dedicated test database...")

try {
  // DB は通常開発でも共有するため、既存コンテナがあれば再作成しない。
  compose("up", "-d", "--no-recreate", "db")
  waitForDb()

  // backend だけは E2E 専用設定を確実に反映するため毎回作り直す。
  compose("up", "-d", "--no-deps", "--force-recreate", "api-e2e")

  console.log("Applying E2E database migrations...")
  compose("exec", "-T", "api-e2e", "alembic", "upgrade", "heads")

  console.log("Resetting E2E database data...")
  compose("exec", "-T", "api-e2e", "python", "scripts/e2e_seed/reset.py")

  console.log("Seeding E2E database...")
  compose("exec", "-T", "api-e2e", "python", "scripts/e2e_seed/run.py")

  console.log(`Running Playwright E2E tests against ${e2eApiBaseUrl}...`)
  exitStatus = runPlaywright()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  exitStatus = 1
} finally {
  console.log("Stopping E2E backend...")
  runStatus("docker", ["compose", "-f", "compose.yaml", "stop", "api-e2e"], {
    cwd: backendRoot,
    env: { ...process.env, ...backendEnv },
  })
}

process.exit(exitStatus)

/**
 * dotenv 形式のファイルを読み込む。
 *
 * Docker Compose と Vite が参照するポートを Node 側でも使うための軽量パーサ。
 * クォートや export は扱わず、このリポジトリの `.env.example` 形式に合わせる。
 *
 * @param {string} filePath 読み込む .env ファイルのパス
 * @returns {Record<string, string>} key-value 形式の環境変数
 */
function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=")
        return [line.slice(0, index), line.slice(index + 1)]
      }),
  )
}

/**
 * コマンドを同期実行し、終了コードを返す。
 *
 * @param {string} command 実行するコマンド
 * @param {string[]} args コマンド引数
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} options 実行オプション
 * @returns {number} 終了コード
 */
function runStatus(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    env: options.env ?? process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  return result.status ?? 1
}

/**
 * コマンドを同期実行し、失敗時は例外にする。
 *
 * @param {string} command 実行するコマンド
 * @param {string[]} args コマンド引数
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} options 実行オプション
 */
function run(command, args, options = {}) {
  const status = runStatus(command, args, options)

  if (status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${status}`)
  }
}

/**
 * backend compose を実行する。
 *
 * @param {...string} args `docker compose -f compose.yaml` に渡す引数
 */
function compose(...args) {
  run("docker", ["compose", "-f", "compose.yaml", ...args], {
    cwd: backendRoot,
    env: { ...process.env, ...backendEnv },
  })
}

/**
 * Playwright を実APIモードで実行する。
 *
 * `E2E_API_BASE_URL` と `VITE_API_BASE_URL` を `api-e2e` の公開 URL に揃える。
 *
 * @returns {number} Playwright の終了コード
 */
function runPlaywright() {
  return runStatus("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
    cwd: frontendRoot,
    env: {
      ...process.env,
      ...frontendEnv,
      E2E_USE_MSW: "false",
      E2E_API_BASE_URL: e2eApiBaseUrl,
      VITE_API_BASE_URL: e2eApiBaseUrl,
      VITE_USE_MSW: "false",
    },
  })
}

/**
 * 指定ミリ秒だけ同期的に待機する。
 *
 * @param {number} milliseconds 待機時間
 */
function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

/**
 * PostgreSQL コンテナが接続可能になるまで待つ。
 */
function waitForDb() {
  for (let i = 0; i < 30; i += 1) {
    const status = runStatus(
      "docker",
      ["compose", "-f", "compose.yaml", "exec", "-T", "db", "pg_isready", "-U", "tasche"],
      {
        cwd: backendRoot,
        env: { ...process.env, ...backendEnv },
      },
    )

    if (status === 0) {
      return
    }

    sleep(1000)
  }

  throw new Error("E2E database did not become ready.")
}
