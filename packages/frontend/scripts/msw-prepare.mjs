import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const useMsw = process.env.VITE_USE_MSW === "true";
const publicDir = path.join(process.cwd(), "public");
const workerFile = path.join(publicDir, "mockServiceWorker.js");

if (!useMsw) {
  if (fs.existsSync(workerFile)) {
    fs.rmSync(workerFile);
  }
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });

const result = spawnSync("msw", ["init", "public", "--save"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
