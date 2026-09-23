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
        // orval 8.28.1 で single/tags モードのモック出力が既定で
        // 別ファイル(client.msw.ts)に分離されるようになったため、
        // 従来通り client.ts にインライン生成させるため明示的に指定する。
        // src/mocks/handlers/generated.ts は client.ts の export を
        // スキャンして MockHandler サフィックス関数を収集する実装のため、
        // 分離されると動作しなくなる。
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
