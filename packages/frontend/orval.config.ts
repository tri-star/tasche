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
      mock: {
        type: "msw",
        delay: 0,
      },
    },
  },
})
