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
      override: {
        // orval が生成する API クライアントの fetch を authFetch 経由にする
        // これにより Authorization ヘッダ付与・401 自動リトライが全 API に適用される
        mutator: {
          path: "./src/auth/authFetch.ts",
          name: "authFetch",
        },
      },
      mock: {
        generators: [
          {
            type: "msw",
            delay: 0,
          },
        ],
      },
    },
  },
})
