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
        // orval 8.28.1 で single モードのモック出力が既定で client.msw.ts に
        // 分離されるようになった(mock.inline の既定値が false に変更)。
        // src/mocks/handlers/generated.ts は client.ts から MockHandler を
        // スキャンする実装のため、従来通り client.ts にインライン生成する。
        inline: true,
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
