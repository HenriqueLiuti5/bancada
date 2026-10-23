import type { Page } from "@playwright/test";
import { cartao, criarConta, diaDaquiA, donoNovo, expect, pularTour, test } from "./apoio";

// As contas a pagar numa assistência nova: lançar o aluguel que se repete todo mês, uma despesa já
// paga, depois de uma recusa que não perde o que foi enviado, e uma conta que vence logo, pagar o
// aluguel vencido, parar a repetição e ver o aviso do painel.

type Conta = {
  descricao: string;
  categoria: string;
  valor: string;
  vencimento?: string;
  fornecedor?: string;
  repetir?: boolean;
};

async function lancarConta(page: Page, conta: Conta): Promise<void> {
  await page.goto("/financeiro/contas/nova");
  await page.getByRole("textbox", { name: "O que é" }).fill(conta.descricao);
  await page.getByRole("combobox", { name: "Categoria" }).selectOption({ label: conta.categoria });
  await page.getByRole("textbox", { name: "Valor" }).fill(conta.valor);
  if (conta.vencimento) await page.getByLabel("Vencimento").fill(conta.vencimento);
  if (conta.fornecedor) await page.getByLabel("Para quem").fill(conta.fornecedor);
  if (conta.repetir) await page.getByRole("checkbox", { name: /Repetir todo mês/ }).check();
  await page.getByRole("button", { name: "Lançar conta" }).click();
  await expect(page).toHaveURL(/\/financeiro\?lancada=1$/);
  await expect(page.getByText("Conta lançada.")).toBeVisible();
}

function lista(page: Page) {
  return page.locator('[data-tour="lista-de-contas"]');
}

function indicador(page: Page, rotulo: string) {
  return page.locator('[data-tour="resumo-das-contas"] > *').filter({ hasText: rotulo });
}

test("o dono lança as contas, paga a vencida, a fixa se repete e o painel avisa o que vence", async ({
  page,
}) => {
  const dono = donoNovo();

  await test.step("cria a conta e abre as contas a pagar vazias", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
    await page.goto("/financeiro");
    await pularTour(page, "Contas a pagar");
    await expect(page.getByText("Nada a pagar")).toBeVisible();
  });

  await test.step("o aluguel que se repete já mostra o mês seguinte", async () => {
    await lancarConta(page, {
      descricao: "Aluguel da loja",
      categoria: "Aluguel e condomínio",
      valor: "1.500,00",
      vencimento: diaDaquiA(-2),
      fornecedor: "Imobiliária Centro",
      repetir: true,
    });

    const alugueis = lista(page).getByRole("listitem").filter({ hasText: "Aluguel da loja" });
    await expect(alugueis).toHaveCount(2);
    await expect(alugueis.first()).toContainText("Há 2 dias");
    await expect(alugueis.first()).toContainText("Imobiliária Centro · todo mês");
    await expect(indicador(page, "Vencidas")).toContainText(/R\$\s1\.500,00/);
  });

  await test.step("a conta recusada continua como foi enviada", async () => {
    await page.goto("/financeiro/contas/nova");
    await page.getByRole("textbox", { name: "O que é" }).fill("Motoboy");
    await page.getByRole("combobox", { name: "Categoria" }).selectOption({ label: "Transporte e entregas" });
    await page.getByRole("textbox", { name: "Valor" }).fill("quinze reais");
    await page.getByRole("checkbox", { name: "Já está paga" }).check();
    await page.getByRole("combobox", { name: "Como foi paga" }).selectOption({ label: "Dinheiro" });
    await page.getByRole("button", { name: "Lançar conta" }).click();

    await expect(page.getByText("Escreva só o número, como 150,00.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "O que é" })).toHaveValue("Motoboy");
    await expect(page.getByRole("combobox", { name: "Categoria" })).toHaveValue("transporte");
    await expect(page.getByRole("checkbox", { name: "Já está paga" })).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Como foi paga" })).toHaveValue("dinheiro");

    await page.getByRole("textbox", { name: "Valor" }).fill("15");
    await page.getByRole("button", { name: "Lançar conta" }).click();
    await expect(page).toHaveURL(/\/financeiro\?lancada=1$/);
  });

  await test.step("a despesa paga na hora vai direto para as pagas do mês", async () => {
    await lancarConta(page, {
      descricao: "Conta de luz",
      categoria: "Luz, água, internet e telefone",
      valor: "250,00",
      vencimento: diaDaquiA(3),
    });

    await expect(indicador(page, "Pagas neste mês")).toContainText(/R\$\s15,00/);
    await expect(indicador(page, "Vencem em 7 dias")).toContainText(/R\$\s250,00/);
    await page.getByRole("link", { name: "Pagas", exact: true }).click();
    await expect(lista(page).getByRole("listitem")).toHaveCount(1);
    await expect(lista(page)).toContainText("Motoboy");
    await expect(lista(page)).toContainText("Dinheiro");
  });

  await test.step("paga o aluguel vencido com juros", async () => {
    await page.goto("/financeiro?situacao=vencidas");
    await lista(page).getByRole("link").filter({ hasText: "Aluguel da loja" }).click();
    await expect(page.getByRole("heading", { name: "Aluguel da loja", level: 1 })).toBeVisible();
    await expect(page.getByText("Vencida", { exact: true })).toBeVisible();

    const pagamento = cartao(page, "Registrar pagamento");
    await pagamento.getByRole("textbox", { name: "Valor pago" }).fill("1.530,00");
    await pagamento.getByRole("combobox", { name: "Como foi paga" }).selectOption({ label: "Boleto" });
    await pagamento.getByRole("button", { name: "Marcar como paga" }).click();

    await expect(cartao(page, "Pagamento")).toContainText(
      `com Boleto, registrada por ${dono.nome}.`,
    );
    await expect(cartao(page, "Conta")).toContainText(/R\$\s1\.530,00/);
  });

  await test.step("para de repetir o aluguel a partir do mês seguinte", async () => {
    await page.goto("/financeiro");
    await lista(page).getByRole("link").filter({ hasText: "Aluguel da loja" }).click();
    await expect(cartao(page, "Repetição")).toBeVisible();
    await page.getByRole("button", { name: "Parar de repetir" }).click();
    await page.getByRole("button", { name: "Sim, parar" }).click();
    await expect(cartao(page, "Repetição")).toBeHidden();
    await expect(page.getByText(/Repete todo mês/)).toBeHidden();
  });

  await test.step("o painel avisa o dono da conta que vence nos próximos dias", async () => {
    await page.goto("/painel");
    await pularTour(page, "Período");
    const aPagar = page.getByRole("link").filter({ hasText: "A pagar logo" });
    await expect(aPagar).toContainText(/R\$\s250,00/);
    await expect(aPagar).toContainText("1 conta nos próximos 7 dias");
  });
});
