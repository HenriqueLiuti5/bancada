import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { diaDaquiA, expect, test } from "./apoio";

// As capturas de tela da página inicial (ADR 0026 e 0038). O make capturar-telas sobe o site sobre um
// banco à parte, com o movimento de exemplo, roda este arquivo e grava as imagens na pasta da página.
const PASTA = path.join(__dirname, "..", "src", "app", "(inicio)", "telas");

async function entrarComoDono(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marcos@central.test");
  await page.getByLabel("Senha").fill("bancada123");
  // Pelo Enter, e não pelo clique, para o ponteiro não ficar sobre a tela capturada.
  await page.getByLabel("Senha").press("Enter");
  await expect(page).toHaveURL(/\/ordens$/);
}

async function rolarAte(page: Page, alvo: Locator, folga: number): Promise<void> {
  const topo = await alvo.evaluate((elemento) => elemento.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, y), topo - folga);
}

async function capturar(page: Page, nome: string): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Como na ADR 0026, o aviso da assinatura não aparece nas capturas.
  await expect(page.getByRole("link", { name: /^(Assinar|Assinar de novo|Pagar a fatura)$/ })).toHaveCount(0);
  await page.screenshot({ path: path.join(PASTA, `${nome}.png`), animations: "disabled" });
}

test.describe("telas do sistema", () => {
  test.use({ deviceScaleFactor: 2 });

  test.beforeEach(async ({ page }) => {
    await entrarComoDono(page);
  });

  test.describe("na abertura", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    // Os últimos 30 dias, e não o mês, para a captura não sair quase vazia no começo do mês.
    test("o dinheiro do painel", async ({ page }) => {
      await page.goto(`/painel?periodo=personalizado&de=${diaDaquiA(-29)}&ate=${diaDaquiA(0)}`);
      const dinheiro = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Dinheiro", exact: true }) })
        .first();
      await expect(dinheiro.getByText("Lucro no período")).toBeVisible();
      await rolarAte(page, dinheiro, 32);
      await capturar(page, "painel-dinheiro");
    });
  });

  // Nos recursos, o notebook é menor, e a tela mais estreita deixa as letras maiores.
  test.describe("nos recursos", () => {
    test.use({ viewport: { width: 1152, height: 720 } });

    test("o estoque", async ({ page }) => {
      await page.goto("/estoque");
      await expect(page.getByText(/precisam? de reposição/)).toBeVisible();
      await capturar(page, "estoque");
    });

    test("as contas a pagar", async ({ page }) => {
      await page.goto("/financeiro");
      await expect(page.getByText("Pagas neste mês")).toBeVisible();
      await capturar(page, "contas-a-pagar");
    });
  });
});

test.describe("página do cliente", () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  for (const etapa of ["em_reparo", "orcamento_enviado"]) {
    test(etapa, async ({ page }) => {
      await page.goto(`/demonstracao?etapa=${etapa}`);
      // A captura começa na página que o cliente recebe, abaixo do topo da demonstração.
      await rolarAte(page, page.locator("main").filter({ has: page.getByRole("heading", { level: 1 }) }), 0);
      await capturar(page, `acompanhamento-${etapa.replaceAll("_", "-")}`);
    });
  }
});
