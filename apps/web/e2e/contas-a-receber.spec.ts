import type { Page } from "@playwright/test";
import { abrirComOProblema, criarConta, diaDaquiA, donoNovo, expect, pularTour, test } from "./apoio";

// Uma ordem entregue com parte do valor para depois: a entrega pede o dia combinado, o cartão da
// ordem diz até quando o cliente vai pagar e cobra pelo WhatsApp, o dia muda com registro no
// histórico, o dono vê a conta no Financeiro e no painel, e o pagamento do resto a leva para as
// recebidas.

const CLIENTE = { nome: "Bruno Lima", telefone: "11987654321" };

async function avancar(page: Page, botao: string, etapa: string | RegExp): Promise<void> {
  await page.getByRole("button", { name: botao }).click();
  await expect(page.getByRole("heading", { name: etapa })).toBeVisible();
}

function emBarras(dia: string): string {
  return dia.split("-").reverse().join("/");
}

function lista(page: Page) {
  return page.locator('[data-tour="lista-do-a-receber"]');
}

function indicador(page: Page, rotulo: string) {
  return page.locator('[data-tour="resumo-do-a-receber"] > *').filter({ hasText: rotulo });
}

test("a entrega com parte para depois vira conta a receber até o cliente pagar o resto", async ({ page }) => {
  const dono = donoNovo();

  await test.step("cria a conta e abre uma ordem pronta para entregar", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
    await page.goto("/ordens/nova");
    await pularTour(page, "Cliente");
    await page.getByRole("button", { name: "Cadastrar cliente novo" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill(CLIENTE.nome);
    await page.getByRole("textbox", { name: "Telefone / WhatsApp" }).fill(CLIENTE.telefone);
    await page.getByRole("textbox", { name: "Marca" }).fill("Motorola");
    await page.getByRole("textbox", { name: "Modelo" }).fill("Moto G54");
    await abrirComOProblema(page, "Não carrega, só com o cabo em certa posição.");
    await pularTour(page, "O que fazer agora");

    await avancar(page, "Começar o diagnóstico", "Montar o orçamento");
    await page.getByRole("tab", { name: /Orçamento/ }).click();
    const orcamento = page.getByRole("tabpanel", { name: /Orçamento/ });
    await orcamento.getByRole("textbox", { name: "Descrição" }).fill("Conector de carga");
    await orcamento.getByRole("textbox", { name: "Valor" }).fill("300");
    await orcamento.getByRole("button", { name: "Adicionar" }).click();
    await expect(orcamento.getByText("Conector de carga", { exact: true })).toBeVisible();

    await avancar(page, "Enviar o orçamento ao cliente", "Esperando a resposta do cliente");
    await avancar(page, "O cliente aprovou", "Orçamento aprovado");
    await avancar(page, "Começar o reparo", "Em reparo");
    await avancar(page, "Reparo pronto", "Pronto para retirada");
  });

  await test.step("a entrega que deixa parte para depois pede o dia combinado", async () => {
    await page.getByRole("button", { name: "Entregar ao cliente" }).click();
    await page.getByRole("textbox", { name: "Valor pago nessa forma" }).fill("100,00");
    await expect(page.getByText("Fica a receber")).toBeVisible();

    const combinado = page.getByLabel("Quando o cliente vai pagar o resto?");
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    expect(await combinado.evaluate((campo: HTMLInputElement) => campo.validity.valueMissing)).toBe(true);
    await expect(page.getByRole("heading", { name: "Pronto para retirada" })).toBeVisible();

    await combinado.fill(diaDaquiA(0));
    await avancar(page, "Confirmar entrega", /Falta receber/);
    await expect(page.getByText(/o cliente combinou pagar o resto hoje/)).toBeVisible();
  });

  await test.step("o cartão cobra o cliente pelo WhatsApp com o valor e o dia", async () => {
    const cobrar = page.getByRole("link", { name: "Cobrar no WhatsApp" });
    const endereco = decodeURIComponent((await cobrar.getAttribute("href")) ?? "");
    expect(endereco).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=Olá, Bruno!/);
    expect(endereco).toMatch(/pagamento de R\$\s200,00 do conserto do seu Motorola Moto G54/);
    expect(endereco).toContain(`combinado para ${emBarras(diaDaquiA(0)).slice(0, 5)}.`);
  });

  await test.step("o cliente pede mais prazo e a mudança fica no histórico", async () => {
    await page.getByRole("button", { name: "Mudar a data" }).click();
    await page.getByLabel("Novo dia combinado").fill(diaDaquiA(5));
    await page.getByRole("button", { name: "Salvar a data" }).click();
    await expect(page.getByText(/o cliente combinou pagar o resto até/)).toBeVisible();

    await page.getByRole("tab", { name: /Histórico/ }).click();
    const historico = page.getByRole("tabpanel", { name: /Histórico/ });
    await expect(historico).toContainText(`Falta receber R$ 200,00, combinado para ${emBarras(diaDaquiA(0))}.`);
    await expect(historico).toContainText(
      `O pagamento do que falta passou de ${emBarras(diaDaquiA(0))} para ${emBarras(diaDaquiA(5))}.`,
    );
    await expect(historico.getByText("combinou o pagamento")).toHaveCount(2);
  });

  await test.step("o dono vê a conta a receber no Financeiro e no painel", async () => {
    await page.goto("/financeiro");
    await pularTour(page, "Contas a pagar");
    await page.getByRole("link", { name: "Contas a receber" }).click();
    await expect(page).toHaveURL(/\/financeiro\/a-receber$/);
    await pularTour(page, "Contas a receber");

    const conta = lista(page).getByRole("listitem").filter({ hasText: CLIENTE.nome });
    await expect(conta).toContainText(/R\$\s200,00/);
    await expect(conta).toContainText(/pagou R\$\s100,00 de R\$\s300,00/);
    await expect(indicador(page, "Vencem em 7 dias")).toContainText(/R\$\s200,00/);
    await expect(indicador(page, "Vencidas")).toContainText("nada atrasado");

    await page.goto("/painel");
    await pularTour(page, "Período");
    const aReceber = page.getByRole("link").filter({ hasText: "A receber" });
    await expect(aReceber).toContainText(/R\$\s200,00/);
    await expect(aReceber).toContainText("1 ordem entregue sem pagamento completo");
  });

  await test.step("o pagamento do resto leva a ordem para as recebidas", async () => {
    await page.goto("/financeiro/a-receber");
    await lista(page).getByRole("link").filter({ hasText: CLIENTE.nome }).click();
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(page.getByRole("textbox", { name: "Valor pago", exact: true })).toHaveValue("200,00");
    await avancar(page, "Registrar pagamento", "Entregue");

    await page.goto("/financeiro/a-receber");
    await expect(page.getByText("Ninguém está devendo")).toBeVisible();
    await expect(indicador(page, "Recebido neste mês")).toContainText(/R\$\s200,00/);
    await page.getByRole("link", { name: "Recebidas", exact: true }).click();
    const recebida = lista(page).getByRole("listitem").filter({ hasText: CLIENTE.nome });
    await expect(recebida).toContainText(/R\$\s300,00/);
    await expect(recebida).toContainText(`Recebido ${emBarras(diaDaquiA(0)).slice(0, 5)}`);
  });
});
