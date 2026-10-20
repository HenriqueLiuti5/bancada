import { randomUUID } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import { test as base, expect, type BrowserContext, type Locator, type Page } from "@playwright/test";

// Todo teste falha se o navegador registrar um erro no console, inclusive uma violação da política
// de segurança de conteúdo (CSP), ou uma exceção que a página não tratou.
export const test = base.extend<{ errosNoNavegador: string[] }>({
  errosNoNavegador: [
    async ({ context }, use) => {
      const erros: string[] = [];
      vigiar(context, erros);
      await use(erros);
      expect(erros, "erros no console do navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

function vigiar(contexto: BrowserContext, erros: string[]): void {
  contexto.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(`${mensagem.page()?.url()}: ${mensagem.text()}`);
  });
  contexto.on("weberror", (erro) => {
    erros.push(`${erro.page()?.url()}: ${erro.error().message}`);
  });
}

export type Dono = { assistencia: string; nome: string; email: string; senha: string };

export function donoNovo(): Dono {
  const codigo = randomUUID().slice(0, 8);
  return {
    assistencia: `Assistência Teste ${codigo}`,
    nome: "Paula Teste",
    email: `paula-${codigo}@exemplo.test`,
    senha: `Bancada-${codigo}!`,
  };
}

export async function criarConta(page: Page, dono: Dono): Promise<void> {
  await page.goto("/cadastro");
  await page.getByLabel("Nome da assistência").fill(dono.assistencia);
  await page.getByLabel("Seu nome").fill(dono.nome);
  await page.getByLabel("E-mail").fill(dono.email);
  await page.getByLabel("WhatsApp da assistência").fill("43996156781");
  await page.getByLabel("Senha").fill(dono.senha);
  await page.getByRole("checkbox", { name: /Li e aceito os termos de uso/ }).check();
  await page.getByRole("button", { name: "Criar conta grátis" }).click();
  await expect(page).toHaveURL(/\/ordens$/);
}

export async function abrirComOProblema(page: Page, problema: string): Promise<void> {
  await page.getByRole("textbox", { name: "Problema relatado" }).fill(problema);
  await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
  await expect(page).toHaveURL(/\/ordens\/\d+$/);
}

// O tour abre sozinho na primeira visita a cada tela e toma o foco da página. Fechá-lo antes de
// continuar evita que ele roube o que está sendo digitado, e esperar o registro garante que ele
// não volte na próxima visita.
export async function pularTour(page: Page, titulo: string): Promise<void> {
  const tour = page.getByRole("dialog", { name: titulo });
  await expect(tour).toBeVisible();
  const registrado = page.waitForResponse(
    (resposta) => resposta.request().method() === "POST" && "next-action" in resposta.request().headers(),
  );
  await tour.getByRole("button", { name: "Pular o tour" }).click();
  await expect(tour).toBeHidden();
  await registrado;
}

export function cartao(page: Page, titulo: string): Locator {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });
}

export function diaDaquiA(dias: number): string {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const dia = new Date(`${hoje}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

function pedacoDoPng(tipo: string, dados: Buffer): Buffer {
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const conteudo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
  const verificacao = Buffer.alloc(4);
  verificacao.writeUInt32BE(crc32(conteudo));
  return Buffer.concat([tamanho, conteudo, verificacao]);
}

// Uma imagem PNG de verdade, com um degradê, montada aqui para o teste não depender de arquivo.
export function fotoDoAparelho(largura = 320, altura = 240): Buffer {
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho.writeUInt8(8, 8);
  cabecalho.writeUInt8(2, 9);

  const linhas = Array.from({ length: altura }, (_, y) => {
    const linha = Buffer.alloc(1 + largura * 3);
    for (let x = 0; x < largura; x += 1) {
      linha[1 + x * 3] = Math.floor((x * 255) / largura);
      linha[2 + x * 3] = Math.floor((y * 255) / altura);
      linha[3 + x * 3] = 160;
    }
    return linha;
  });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedacoDoPng("IHDR", cabecalho),
    pedacoDoPng("IDAT", deflateSync(Buffer.concat(linhas))),
    pedacoDoPng("IEND", Buffer.alloc(0)),
  ]);
}
