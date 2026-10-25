import type { Browser, Page } from "@playwright/test";
import { cartao, criarConta, donoNovo, expect, pularTour, test, type Dono } from "./apoio";

// O caixa do dia numa assistência nova: a primeira conferência é o ponto de partida, o reforço, a
// conta paga em dinheiro e a retirada mudam o que deve ter na gaveta, a atendente conta o dinheiro
// sem ver quanto devia ter, e o dono vê que faltou, na tela do caixa e no painel.

const ATENDENTE = "Rita Atendente";

function gaveta(page: Page) {
  return page.locator('[data-tour="gaveta-do-dia"]');
}

async function conferir(page: Page, contado: string): Promise<void> {
  await page.getByRole("button", { name: "Conferir a gaveta" }).click();
  await page.getByLabel("Quanto tem na gaveta?").fill(contado);
  await page.getByRole("button", { name: "Registrar a conferência" }).click();
}

async function movimentar(page: Page, tipo: "Retirada" | "Reforço", valor: string, motivo: string) {
  await page.getByRole("button", { name: tipo, exact: true }).click();
  await page.getByRole("textbox", { name: /Quanto (saiu da|entrou na) gaveta/ }).fill(valor);
  await page.getByRole("textbox", { name: "Motivo" }).fill(motivo);
  await page.getByRole("button", { name: `Registrar ${tipo === "Retirada" ? "a retirada" : "o reforço"}` }).click();
  await expect(page.getByText(`${tipo === "Retirada" ? "Retirada registrada" : "Reforço registrado"}.`)).toBeVisible();
}

async function convidarAtendente(page: Page, browser: Browser, dono: Dono): Promise<Page> {
  await page.goto("/equipe");
  await pularTour(page, "Quem usa o sistema");
  const convite = cartao(page, "Convidar pessoa");
  await convite.getByRole("textbox", { name: "Nome", exact: true }).fill(ATENDENTE);
  await convite.getByRole("combobox", { name: "Papel" }).selectOption({ label: "Atendente" });
  await convite.getByRole("textbox", { name: "E-mail" }).fill(dono.email.replace("paula-", "rita-"));
  await convite.getByRole("button", { name: "Criar convite" }).click();
  const link = await convite.getByText(/\/convite\//).textContent();

  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  await atendente.goto(new URL(new URL(link!).pathname, page.url()).href);
  await atendente.getByLabel("Crie uma senha").fill(dono.senha);
  await atendente.getByRole("button", { name: "Entrar na equipe" }).click();
  await expect(atendente).toHaveURL(/\/ordens$/);
  await pularTour(atendente, "Boas-vindas ao Bancada");
  return atendente;
}

test("a gaveta parte da primeira conferência, a equipe conta às cegas e o dono vê o que faltou", async ({
  page,
  browser,
}) => {
  const dono = donoNovo();

  await test.step("a primeira conferência é o ponto de partida", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
    await page.goto("/financeiro/caixa");
    await pularTour(page, "Caixa do dia");
    await expect(gaveta(page)).toContainText("registre a primeira conferência");

    await conferir(page, "100,00");
    await expect(page.getByText("Conferência registrada. Ponto de partida.")).toBeVisible();
    await expect(gaveta(page)).toContainText(/Deve ter na gaveta agora\s*R\$\s100,00/);
  });

  await test.step("reforço, conta paga em dinheiro e retirada mudam o que deve ter", async () => {
    await movimentar(page, "Reforço", "50,00", "Troco do banco");
    await expect(gaveta(page)).toContainText(/Deve ter na gaveta agora\s*R\$\s150,00/);

    await page.goto("/financeiro/contas/nova");
    await page.getByRole("textbox", { name: "O que é" }).fill("Motoboy");
    await page.getByRole("combobox", { name: "Categoria" }).selectOption({ label: "Transporte e entregas" });
    await page.getByRole("textbox", { name: "Valor" }).fill("15");
    await page.getByRole("checkbox", { name: "Já está paga" }).check();
    await page.getByRole("combobox", { name: "Como foi paga" }).selectOption({ label: "Dinheiro" });
    await page.getByRole("button", { name: "Lançar conta" }).click();
    await expect(page).toHaveURL(/\/financeiro\?lancada=1$/);

    await page.goto("/financeiro/caixa");
    await movimentar(page, "Retirada", "35,00", "Depósito no banco");
    await expect(gaveta(page)).toContainText(/Deve ter na gaveta agora\s*R\$\s100,00/);

    const movimentos = page.locator('[data-tour="movimentos-do-dia"]');
    await expect(movimentos).toContainText("Troco do banco");
    await expect(movimentos).toContainText("Depósito no banco");
    await expect(movimentos.getByRole("link").filter({ hasText: "Motoboy" })).toBeVisible();
  });

  await test.step("a atendente conta a gaveta sem ver quanto devia ter", async () => {
    const atendente = await convidarAtendente(page, browser, dono);
    await atendente.goto("/financeiro/caixa");
    await pularTour(atendente, "Caixa do dia");
    await expect(atendente.locator('[data-tour="gaveta-do-dia"]')).toHaveCount(0);

    await conferir(atendente, "95,00");
    await expect(atendente.getByText("Conferência registrada. O dono vê se bateu.")).toBeVisible();
    await expect(cartao(atendente, "Registrado hoje")).toContainText(/R\$\s95,00/);
    await expect(atendente.getByText(/Faltaram|Deve ter/)).toHaveCount(0);
    await atendente.context().close();
  });

  await test.step("o dono vê que faltou dinheiro, no caixa e no painel", async () => {
    await page.goto("/financeiro/caixa");
    await expect(gaveta(page)).toContainText(new RegExp(`${ATENDENTE.split(" ")[0]}.*contou\\s*R\\$\\s95,00`));
    await expect(gaveta(page)).toContainText(/Faltaram R\$\s5,00/);
    await expect(gaveta(page)).toContainText(/Deve ter na gaveta agora\s*R\$\s95,00/);

    await page.goto("/painel");
    await pularTour(page, "Período");
    const caixa = page.getByRole("link").filter({ hasText: "Caixa" }).filter({ hasText: "conferência" });
    await expect(caixa).toContainText(/-R\$\s5,00/);
    await expect(caixa).toContainText("faltou na conferência de hoje");
  });
});
