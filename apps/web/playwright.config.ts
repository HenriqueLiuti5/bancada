import { defineConfig, devices } from "@playwright/test";

// Os testes de navegador abrem o site que estiver no ar em ENDERECO_DO_SITE: na CI, o das imagens
// de produção; aqui, por padrão, o de desenvolvimento. Cada teste cria a própria assistência pelo
// cadastro, então não dependem dos dados de exemplo.
const NA_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: NA_CI,
  retries: NA_CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: NA_CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.ENDERECO_DO_SITE ?? "http://localhost:3000",
    // Só para o certificado local que o Caddy gera para localhost.
    ignoreHTTPSErrors: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "computador",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } },
    },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
});
