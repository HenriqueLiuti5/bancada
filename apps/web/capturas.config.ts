import { defineConfig } from "@playwright/test";

// As capturas de tela da página inicial não são testes: o make capturar-telas sobe o site sobre um
// banco à parte, com o movimento de exemplo, e roda e2e/capturas.ts contra ele (ADR 0038).
export default defineConfig({
  testDir: "./e2e",
  testMatch: "capturas.ts",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.ENDERECO_DAS_CAPTURAS ?? "http://localhost:3001",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
  },
});
