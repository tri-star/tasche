import { defineConfig } from "orval"

export default defineConfig({
  tasche: {
    input: {
      target: "../backend/openapi.json",
    },
    output: {
      target: "./src/api/generated/client.ts",
      schemas: "./src/api/generated/model",
      client: "fetch",
      mode: "single",
      clean: true,
      prettier: false,
      biome: false,
      // orval が生成する API クライアントの fetch を authFetch 経由にする
      // これにより Authorization ヘッダ付与・401 自動リトライが全 API に適用される
      // 注意: pnpm openapi:update を実行した際は自動的に適用される
      mutator: {
        path: "./src/auth/authFetch.ts",
        name: "authFetch",
      },
      mock: {
        type: "msw",
        delay: 0,
      },
    },
  },
})
