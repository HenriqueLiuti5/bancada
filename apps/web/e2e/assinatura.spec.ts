import { cartao, criarConta, donoNovo, expect, pularTour, test } from "./apoio";

const CPF = "529.982.247-25";

test("o plano que não cabe na assistência fica de fora, e o menor que cabe já vem escolhido", async ({
  page,
}) => {
  const dono = donoNovo();
  await criarConta(page, dono);
  await pularTour(page, "Boas-vindas ao Bancada");

  await page.goto("/equipe");
  await pularTour(page, "Quem usa o sistema");
  const convite = cartao(page, "Convidar pessoa");
  async function convidar(nome: string): Promise<void> {
    await convite.getByRole("textbox", { name: "Nome", exact: true }).fill(`${nome} Teste`);
    await convite
      .getByRole("textbox", { name: "E-mail" })
      .fill(dono.email.replace("paula-", `${nome.toLowerCase()}-`));
    await convite.getByRole("button", { name: "Criar convite" }).click();
    await expect(convite.getByText(`Convite criado para ${nome} Teste.`)).toBeVisible();
  }
  await convidar("Rafael");
  await convite.getByRole("button", { name: "Convidar outra pessoa" }).click();
  await convidar("Bruna");

  // O dono e os dois convites ainda não aceitos são 3 pessoas, uma a mais do que o Solo leva.
  await page.goto("/assinatura");
  await expect(page.getByRole("radio", { name: /^Solo/ })).toBeDisabled();
  await expect(
    page.getByText(
      "A assistência tem 3 pessoas, contando os convites ainda não aceitos, e o plano Solo é para até 2.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Equipe/ })).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Assinar o plano Equipe por R$ 59,90 por mês" }),
  ).toBeVisible();
});

test("o dono assina o plano anual e, cancelando ainda no teste grátis, não paga nada", async ({
  page,
}) => {
  test.skip(!process.env.ENDERECO_DO_ASAAS, "assinar precisa do Asaas falso no ar");

  await criarConta(page, donoNovo());
  await pularTour(page, "Boas-vindas ao Bancada");
  await page.goto("/assinatura");

  await expect(page.getByRole("radio", { name: /^Solo/ })).toBeChecked();
  await page.getByText("2 meses grátis").click();
  await page.getByRole("radio", { name: /^Equipe/ }).check();
  await page.getByRole("textbox", { name: "CPF ou CNPJ de quem paga" }).fill(CPF);
  await page.getByRole("button", { name: "Assinar o plano Equipe por R$ 599,00 por ano" }).click();

  await expect(page.getByText("Plano Equipe, pagamento anual: R$ 599,00 por ano")).toBeVisible();
  const fatura = cartao(page, "Faturas").getByRole("listitem");
  await expect(fatura).toContainText("R$ 599,00");
  await expect(fatura).toContainText("Aguardando pagamento");

  await page.getByRole("button", { name: "Cancelar assinatura" }).click();
  await expect(page.getByText(/Nada mais é cobrado\. Você continua usando até/)).toBeVisible();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();

  await expect(page.getByText(/A assinatura foi cancelada\. Você usa normalmente até/)).toBeVisible();
  await expect(fatura).toContainText("Cancelada");
});
