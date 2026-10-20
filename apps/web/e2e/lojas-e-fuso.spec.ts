import type { Locator, Page } from "@playwright/test";
import { abrirComOProblema, cartao, criarConta, donoNovo, expect, pularTour, test } from "./apoio";

// Depois de "Matriz" na ordem alfabética, para não ser a loja que a abertura já traz escolhida.
const LOJA = { nome: "Unidade Centro", endereco: "Rua XV de Novembro, 100" };
const PROBLEMA = "Não liga depois que molhou.";
const BRASILIA = "America/Sao_Paulo";
const MANAUS = "America/Manaus";
const UM_MINUTO = 60_000;

// As horas e minutos que a tela pode mostrar para um momento entre "de" e "ate", com um minuto de
// folga para cada lado, porque o relógio pode virar o minuto no meio do passo.
function horasPossiveis(de: Date, ate: Date, fuso: string): RegExp {
  const formato = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso });
  const horas = new Set<string>();
  const primeiro = Math.floor((de.getTime() - UM_MINUTO) / UM_MINUTO) * UM_MINUTO;
  for (let momento = primeiro; momento <= ate.getTime() + UM_MINUTO; momento += UM_MINUTO) {
    horas.add(formato.format(momento));
  }
  return new RegExp(`(${[...horas].join("|")})`);
}

function horaDaAbertura(page: Page): Locator {
  return page.getByText(/aberta em/);
}

test("o dono cadastra outra loja, abre uma ordem nela, desativa a loja e muda o fuso horário", async ({
  page,
}) => {
  const dono = donoNovo();
  let ordem = "";
  let abertura = { de: new Date(), ate: new Date() };

  await test.step("cria a conta, que começa com uma loja no horário de Brasília", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");

    await page.goto("/assistencia");
    await expect(cartao(page, "Dados da assistência").getByRole("combobox", { name: "Fuso horário" })).toHaveValue(
      BRASILIA,
    );
    await expect(page.getByRole("heading", { name: "Loja", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Desativar/ })).toHaveCount(0);
  });

  await test.step("cadastra a segunda loja na tela Assistência", async () => {
    const novaLoja = cartao(page, "Nova loja");
    await novaLoja.getByRole("button", { name: "Adicionar loja" }).click();
    await novaLoja.getByRole("textbox", { name: "Nome da loja" }).fill(LOJA.nome);
    await novaLoja.getByRole("textbox", { name: "Endereço" }).fill(LOJA.endereco);
    await novaLoja.getByRole("button", { name: "Criar loja" }).click();

    await expect(novaLoja.getByText("Loja criada.")).toBeVisible();
    await expect(page.getByRole("heading", { name: LOJA.nome, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Matriz", exact: true })).toBeVisible();
  });

  await test.step("abre uma ordem na loja nova, que continua escolhida depois de um erro", async () => {
    await page.goto("/ordens/nova");
    await pularTour(page, "Cliente");

    const loja = page.getByRole("combobox", { name: "Loja" });
    await expect(loja.locator("option:checked")).toHaveText("Matriz");
    await loja.selectOption({ label: LOJA.nome });
    await page.getByRole("textbox", { name: "Problema relatado" }).fill(PROBLEMA);
    await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
    await expect(page.getByText("Escolha um cliente já cadastrado ou cadastre um novo.")).toBeVisible();
    await expect(loja.locator("option:checked")).toHaveText(LOJA.nome);

    await page.getByRole("button", { name: "Cadastrar cliente novo" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Joana Prado");
    await page.getByRole("textbox", { name: "Telefone / WhatsApp" }).fill("43991234567");
    await page.getByRole("textbox", { name: "Marca" }).fill("Motorola");
    await page.getByRole("textbox", { name: "Modelo" }).fill("Moto G84");

    const de = new Date();
    await abrirComOProblema(page, PROBLEMA);
    abertura = { de, ate: new Date() };
    ordem = new URL(page.url()).pathname;
    await pularTour(page, "O que fazer agora");

    await expect(page.getByText(LOJA.nome, { exact: true })).toBeVisible();
    await expect(horaDaAbertura(page)).toHaveText(horasPossiveis(abertura.de, abertura.ate, BRASILIA));
  });

  await test.step("desativa a loja nova, que some da abertura de ordens", async () => {
    await page.goto("/assistencia");
    await page.getByRole("button", { name: `Desativar ${LOJA.nome}` }).click();

    const desativadas = cartao(page, "Lojas desativadas");
    await expect(desativadas.getByText(LOJA.nome, { exact: true })).toBeVisible();
    await expect(desativadas.getByRole("button", { name: `Reativar ${LOJA.nome}` })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Desativar/ })).toHaveCount(0);

    await page.goto("/ordens/nova");
    await expect(page.getByRole("heading", { name: "Nova ordem de serviço" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Problema relatado" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Loja" })).toHaveCount(0);
  });

  await test.step("passa a assistência para o horário de Manaus", async () => {
    await page.goto("/assistencia");
    const dados = cartao(page, "Dados da assistência");
    const fuso = dados.getByRole("combobox", { name: "Fuso horário" });

    const escolha = new Date();
    await fuso.selectOption(MANAUS);
    await expect(dados.getByText(/^Confira: agora são/)).toHaveText(horasPossiveis(escolha, new Date(), MANAUS));

    await dados.getByRole("button", { name: "Salvar" }).click();
    await expect(dados.getByText("Salvo.")).toBeVisible();
    await expect(fuso).toHaveValue(MANAUS);

    await page.reload();
    await expect(fuso).toHaveValue(MANAUS);
  });

  await test.step("a ordem da loja desativada continua com ela, agora na hora de Manaus", async () => {
    await page.goto(ordem);
    await expect(page.getByText(LOJA.nome, { exact: true })).toBeVisible();
    await expect(horaDaAbertura(page)).toHaveText(horasPossiveis(abertura.de, abertura.ate, MANAUS));
  });
});
