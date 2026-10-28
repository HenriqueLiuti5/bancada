import type { APIRequestContext, Page, Request } from "@playwright/test";
import { criarConta, donoNovo, expect, test } from "./apoio";

// O Umami sobe na CI das imagens de produção; sem ele, o site não carrega o contador.
const UMAMI = process.env.ENDERECO_DO_UMAMI;
test.skip(!UMAMI, "a medição de visitas precisa do Umami no ar");

const CONTADOR = 'script[src="/estatisticas/contador"]';

function paginaDaVisita(pedido: Request): string | null {
  if (!pedido.url().endsWith("/estatisticas/api/send")) return null;
  const endereco = pedido.postDataJSON()?.payload?.url;
  return typeof endereco === "string" ? new URL(endereco, "http://bancada").pathname : null;
}

function visitaA(page: Page, caminho: string) {
  return page.waitForResponse((resposta) => paginaDaVisita(resposta.request()) === caminho);
}

// O que o Umami guardou da visita, lido na API do painel dele.
async function eventosDaVisita(request: APIRequestContext, sessao: string, desde: number) {
  const resposta = await request.get(
    `${UMAMI}/api/websites/${process.env.UMAMI_ID_DO_SITE}/sessions/${sessao}/activity`,
    {
      params: { startAt: desde, endAt: Date.now() },
      headers: { Authorization: `Bearer ${process.env.TOKEN_DO_UMAMI}` },
    },
  );
  expect(resposta.ok(), await resposta.text()).toBe(true);
  const atividade: { eventName: string | null }[] = await resposta.json();
  return atividade.map((evento) => evento.eventName);
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
  request,
}) => {
  const inicio = Date.now();
  const cadastro = visitaA(page, "/cadastro");
  const dentroDoSistema = visitaA(page, "/ordens");

  await criarConta(page, donoNovo());

  const { sessionId } = await (await cadastro).json();
  expect(await (await dentroDoSistema).json()).toEqual({});
  // O servidor manda o evento depois de responder, e o Umami o põe na visita do navegador.
  await expect.poll(() => eventosDaVisita(request, sessionId, inicio)).toContain("cadastro");
});

test("a página de acompanhamento do cliente não carrega o contador", async ({ page }) => {
  await page.goto("/demonstracao");
  await expect(page.locator(CONTADOR)).toHaveCount(1);

  await page.goto("/os/link-que-nao-existe");

  await expect(page.locator(CONTADOR)).toHaveCount(0);
});
