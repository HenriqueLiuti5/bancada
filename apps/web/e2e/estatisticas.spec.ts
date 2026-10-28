import type { Page, Request } from "@playwright/test";
import { criarConta, donoNovo, expect, test } from "./apoio";

// O Umami sobe na CI das imagens de produção; sem ele, o site não carrega o contador.
test.skip(!process.env.ESTATISTICAS, "a medição de visitas precisa do Umami no ar");

const CONTADOR = 'script[src="/estatisticas/contador"]';

function paginaDaVisita(pedido: Request): string | null {
  if (!pedido.url().endsWith("/estatisticas/api/send")) return null;
  const endereco = pedido.postDataJSON()?.payload?.url;
  return typeof endereco === "string" ? new URL(endereco, "http://bancada").pathname : null;
}

function visitaA(page: Page, caminho: string) {
  return page.waitForResponse((resposta) => paginaDaVisita(resposta.request()) === caminho);
}

test("a visita à página inicial chega ao Umami pelo próprio site", async ({ page }) => {
  const visita = visitaA(page, "/");
  await page.goto("/");

  const resposta = await visita;
  expect(resposta.ok()).toBe(true);
  expect(await resposta.json()).toHaveProperty("sessionId");
});

test("o cadastro é contado, e o que acontece dentro do sistema não chega ao Umami", async ({
  page,
}) => {
  const cadastro = visitaA(page, "/cadastro");
  const dentroDoSistema = visitaA(page, "/ordens");

  await criarConta(page, donoNovo());

  expect(await (await cadastro).json()).toHaveProperty("sessionId");
  expect(await (await dentroDoSistema).json()).toEqual({});
});

test("a página de acompanhamento do cliente não carrega o contador", async ({ page }) => {
  await page.goto("/demonstracao");
  await expect(page.locator(CONTADOR)).toHaveCount(1);

  await page.goto("/os/link-que-nao-existe");

  await expect(page.locator(CONTADOR)).toHaveCount(0);
});
