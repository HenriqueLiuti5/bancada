import type { Locator, Page } from "@playwright/test";
import { abrirComOProblema, cartao, criarConta, donoNovo, expect, pularTour, test } from "./apoio";

// O caminho do estoque numa assistência nova: cadastrar uma peça e um acessório, registrar a compra
// que chegou, usar a peça num orçamento que o cliente aprova, vender acessórios no balcão e ver o
// que precisa repor, na tela do produto e no painel.

async function cadastrarProduto(
  page: Page,
  campos: { nome: string; tipo?: string; custo: string; preco: string; minimo?: string; quantidade: string },
): Promise<void> {
  await page.goto("/estoque/novo");
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill(campos.nome);
  if (campos.tipo) await page.getByRole("combobox", { name: "Tipo" }).selectOption({ label: campos.tipo });
  await page.getByRole("textbox", { name: "Custo" }).fill(campos.custo);
  await page.getByRole("textbox", { name: "Preço de venda" }).fill(campos.preco);
  if (campos.minimo) await page.getByRole("textbox", { name: "Estoque mínimo" }).fill(campos.minimo);
  await page.getByRole("textbox", { name: "Quantidade agora" }).fill(campos.quantidade);
  await page.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByRole("heading", { name: campos.nome, level: 1 })).toBeVisible();
}

async function escolherOpcao(seletor: Locator, texto: string): Promise<void> {
  const valor = await seletor.locator("option", { hasText: texto }).first().getAttribute("value");
  await seletor.selectOption(valor!);
}

function linhaDoProduto(page: Page, nome: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByText(nome, { exact: true }) });
}

test("a peça sai do estoque na aprovação, o acessório na venda e o painel mostra o que repor", async ({
  page,
}) => {
  const dono = donoNovo();

  await test.step("cria a conta e abre o estoque vazio", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
    await page.goto("/estoque");
    await pularTour(page, "Estoque e vendas");
    await expect(page.getByText("Nenhum produto cadastrado")).toBeVisible();
  });

  await test.step("cadastra a peça com o que há na prateleira e registra a compra que chegou", async () => {
    await cadastrarProduto(page, {
      nome: "Tela Moto G54",
      custo: "180,00",
      preco: "320,00",
      minimo: "2",
      quantidade: "3",
    });
    await expect(cartao(page, "Em estoque")).toContainText(/3\s*unidades/);

    const entrada = cartao(page, "Registrar entrada");
    await entrada.getByRole("textbox", { name: "Quantidade" }).fill("1");
    await entrada.getByRole("textbox", { name: "Custo de cada unidade" }).fill("200,00");
    // O campo do fornecedor sugere os já usados, e por isso é uma caixa de escolha.
    await entrada.getByRole("combobox", { name: "Fornecedor" }).fill("Distribuidora Sul");
    await entrada.getByRole("button", { name: "Registrar entrada" }).click();
    await expect(entrada.getByText("Entrada registrada.")).toBeVisible();
    await expect(cartao(page, "Em estoque")).toContainText(/4\s*unidades/);
    await expect(page.getByText(/custo R\$\s185,00/).first()).toBeVisible();
    await expect(cartao(page, "Movimentações")).toContainText("Distribuidora Sul");
  });

  await test.step("cadastra o acessório vendido no balcão", async () => {
    await cadastrarProduto(page, {
      nome: "Capa Moto G54",
      tipo: "Acessório para vender",
      custo: "12",
      preco: "39,90",
      quantidade: "10",
    });
  });

  await test.step("a peça do estoque entra no orçamento com o preço e mostra o lucro", async () => {
    await page.goto("/ordens/nova");
    await pularTour(page, "Cliente");
    await page.getByRole("button", { name: "Cadastrar cliente novo" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Carla Mendes");
    await page.getByRole("textbox", { name: "Telefone / WhatsApp" }).fill("41988887777");
    await page.getByRole("textbox", { name: "Marca" }).fill("Motorola");
    await page.getByRole("textbox", { name: "Modelo" }).fill("Moto G54");
    await abrirComOProblema(page, "Tela quebrada depois de uma queda.");
    await pularTour(page, "O que fazer agora");

    await page.getByRole("button", { name: "Começar o diagnóstico" }).click();
    await expect(page.getByRole("heading", { name: "Montar o orçamento" })).toBeVisible();
    await page.getByRole("tab", { name: /Orçamento/ }).click();
    const orcamento = page.getByRole("tabpanel", { name: /Orçamento/ });

    await escolherOpcao(orcamento.getByRole("combobox", { name: "Peça do estoque" }), "Tela Moto G54");
    await expect(orcamento.getByRole("textbox", { name: "Descrição" })).toHaveValue("Tela Moto G54");
    await expect(orcamento.getByRole("textbox", { name: "Valor" })).toHaveValue("320,00");
    await expect(orcamento.getByText(/4 nesta loja/)).toBeVisible();
    await orcamento.getByRole("button", { name: "Adicionar" }).click();
    await expect(orcamento.getByRole("listitem").filter({ hasText: "Tela Moto G54" })).toContainText(
      "do estoque",
    );

    await orcamento.getByRole("combobox", { name: "Tipo" }).selectOption({ label: "Serviço" });
    await orcamento.getByRole("textbox", { name: "Descrição" }).fill("Mão de obra");
    await orcamento.getByRole("textbox", { name: "Valor" }).fill("90");
    await orcamento.getByRole("button", { name: "Adicionar" }).click();
    await expect(orcamento.getByRole("listitem")).toHaveCount(2);
    await expect(orcamento).toContainText(/Lucro previsto\s*R\$\s225,00/);
  });

  await test.step("a aprovação tira a peça do estoque", async () => {
    await page.getByRole("button", { name: "Enviar o orçamento ao cliente" }).click();
    await expect(page.getByRole("heading", { name: "Esperando a resposta do cliente" })).toBeVisible();
    await page.getByRole("button", { name: "O cliente aprovou" }).click();
    await page.getByRole("button", { name: "Confirmar a aprovação" }).click();
    await expect(page.getByRole("heading", { name: "Orçamento aprovado" })).toBeVisible();

    await page.goto("/estoque");
    await expect(linhaDoProduto(page, "Tela Moto G54")).toContainText("3 un.");
    await linhaDoProduto(page, "Tela Moto G54").getByRole("link").click();
    await expect(cartao(page, "Movimentações")).toContainText("Peça usada em ordem");
    await expect(cartao(page, "Movimentações").getByRole("link", { name: "OS #1" })).toBeVisible();
  });

  await test.step("a venda no balcão tira os acessórios e mostra o lucro", async () => {
    await page.goto("/estoque/vendas/nova");
    await escolherOpcao(page.getByRole("combobox", { name: "Produto" }), "Capa Moto G54");
    await page.getByRole("textbox", { name: "Quantidade" }).fill("2");
    await expect(page.getByRole("textbox", { name: "Valor cobrado" })).toHaveValue("79,80");
    await expect(page.getByRole("textbox", { name: "Valor pago nessa forma" })).toHaveValue("79,80");
    await page.getByRole("button", { name: "Confirmar venda" }).click();

    await expect(page.getByRole("heading", { name: "Venda #1" })).toBeVisible();
    await expect(page.getByText("Venda registrada.")).toBeVisible();
    await expect(cartao(page, "Produtos")).toContainText(/Lucro\s*R\$\s55,80/);

    await page.goto("/estoque");
    await expect(linhaDoProduto(page, "Capa Moto G54")).toContainText("8 un.");
  });

  await test.step("a contagem abaixo do mínimo pede reposição, também no painel", async () => {
    await linhaDoProduto(page, "Tela Moto G54").getByRole("link").click();
    await page.getByRole("button", { name: "Corrigir a contagem" }).click();
    await page.getByRole("textbox", { name: "Quantas você contou" }).fill("1");
    await page.getByRole("textbox", { name: "Motivo" }).fill("Uma trincou na prateleira");
    await page.getByRole("button", { name: "Salvar contagem" }).click();
    await expect(page.getByText("Contagem salva.")).toBeVisible();
    await expect(cartao(page, "Em estoque")).toContainText("Abaixo do mínimo de 2.");

    await page.goto("/estoque");
    await expect(page.getByText("1 produto precisa de reposição.")).toBeVisible();

    await page.goto("/painel");
    await pularTour(page, "Período");
    const paraRepor = page.getByRole("link").filter({ hasText: "Para repor" });
    await expect(paraRepor).toContainText("1");
    await expect(page.getByText(/Vendas no balcão:\s*R\$\s79,80/)).toBeVisible();
  });
});
