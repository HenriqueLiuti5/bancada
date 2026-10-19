import type { Locator, Page } from "@playwright/test";
import { diaDaquiA, donoNovo, expect, fotoDoAparelho, pularTour, test, type Dono } from "./apoio";

const CLIENTE = { nome: "Maria Aparecida Souza", primeiroNome: "Maria", telefone: "11987654321" };
const LEGENDA_DA_FOTO = "Tela trincada no canto";
const ETAPAS = ["Recebido", "Em diagnóstico", "Orçamento enviado", "Aprovado", "Em reparo", "Pronto", "Entregue"];

async function criarConta(page: Page, dono: Dono): Promise<void> {
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

async function sair(page: Page, dono: Dono): Promise<void> {
  await page
    .getByRole("button", { name: new RegExp(`${dono.nome}|Sua conta`) })
    .filter({ visible: true })
    .click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function entrar(page: Page, dono: Dono): Promise<void> {
  await page.getByLabel("E-mail").fill(dono.email);
  await page.getByLabel("Senha").fill(dono.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/ordens$/);
}

async function adicionarItem(orcamento: Locator, tipo: string, descricao: string, valor: string) {
  const campoDaDescricao = orcamento.getByRole("textbox", { name: "Descrição" });
  await orcamento.getByRole("combobox", { name: "Tipo" }).selectOption({ label: tipo });
  await campoDaDescricao.fill(descricao);
  await orcamento.getByRole("textbox", { name: "Valor" }).fill(valor);
  await orcamento.getByRole("button", { name: "Adicionar" }).click();
  await expect(orcamento.getByText(descricao, { exact: true })).toBeVisible();
  await expect(campoDaDescricao).toHaveValue("");
}

async function avancar(page: Page, botao: string, etapa: string): Promise<void> {
  await page.getByRole("button", { name: botao }).click();
  await expect(page.getByRole("heading", { name: etapa })).toBeVisible();
}

async function conferirFoto(foto: Locator): Promise<void> {
  await expect(foto).toBeVisible();
  await expect.poll(() => foto.evaluate((imagem: HTMLImageElement) => imagem.naturalWidth)).toBeGreaterThan(0);
}

test("a assistência se cadastra, atende uma ordem do balcão à entrega e o cliente acompanha", async ({
  page,
}) => {
  const dono = donoNovo();

  await test.step("cria a conta pelo cadastro", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
    await expect(page.getByRole("heading", { name: "Ordens de serviço" })).toBeVisible();
  });

  await test.step("sai e entra de novo com o e-mail e a senha", async () => {
    await sair(page, dono);
    await entrar(page, dono);
    await expect(page.getByRole("heading", { name: "Ordens de serviço" })).toBeVisible();
  });

  await test.step("abre a ordem com cliente e aparelho novos", async () => {
    await page.getByRole("link", { name: /Nova ordem/ }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/ordens\/nova$/);
    await pularTour(page, "Cliente");

    await page.getByRole("button", { name: "Cadastrar cliente novo" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill(CLIENTE.nome);
    const telefone = page.getByRole("textbox", { name: "Telefone / WhatsApp" });
    await telefone.fill(CLIENTE.telefone);
    await telefone.blur();
    await expect(telefone).toHaveValue("(11) 98765-4321");
    await expect(page.getByText("Confira: (11) 98765-4321, celular com DDD 11 (SP).")).toBeVisible();

    await page.getByRole("textbox", { name: "Marca" }).fill("Samsung");
    await page.getByRole("textbox", { name: "Modelo" }).fill("Galaxy A54");
    await page.getByRole("textbox", { name: "Senha de desbloqueio" }).fill("1-2-3-6-9");
    await page
      .getByRole("textbox", { name: "Problema relatado" })
      .fill("Caiu no chão e a tela trincou. O toque falha no canto de baixo.");
    await page.getByLabel("Prazo prometido").fill(diaDaquiA(3));
    await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();

    await expect(page).toHaveURL(/\/ordens\/\d+$/);
    await pularTour(page, "O que fazer agora");
    await expect(page.getByRole("heading", { name: /OS #\d+/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aparelho recebido" })).toBeVisible();
  });

  await test.step("fotografa o aparelho na entrada", async () => {
    await page.getByLabel(/Tirar ou escolher uma foto/).setInputFiles({
      name: "aparelho.png",
      mimeType: "image/png",
      buffer: fotoDoAparelho(),
    });
    await page.getByRole("textbox", { name: "Legenda" }).fill(LEGENDA_DA_FOTO);
    await page.getByRole("button", { name: "Adicionar foto" }).click();
    await conferirFoto(page.getByRole("img", { name: LEGENDA_DA_FOTO }));
  });

  await test.step("monta o orçamento, envia ao cliente e registra a aprovação", async () => {
    await avancar(page, "Começar o diagnóstico", "Montar o orçamento");

    await page.getByRole("tab", { name: /Orçamento/ }).click();
    const orcamento = page.getByRole("tabpanel", { name: /Orçamento/ });
    await adicionarItem(orcamento, "Peça", "Tela com moldura Galaxy A54", "480,00");
    await adicionarItem(orcamento, "Serviço", "Mão de obra", "90");
    await expect(orcamento.getByRole("listitem")).toHaveCount(2);
    await expect(orcamento.getByText("R$ 570,00")).toBeVisible();

    await avancar(page, "Enviar o orçamento ao cliente", "Esperando a resposta do cliente");

    await page.getByRole("button", { name: "O cliente aprovou" }).click();
    const aprovados = page.getByRole("group", { name: "O que o cliente aprovou?" }).getByRole("checkbox");
    await expect(aprovados).toHaveCount(2);
    await expect(aprovados.first()).toBeChecked();
    await expect(aprovados.last()).toBeChecked();
    await avancar(page, "Confirmar a aprovação", "Orçamento aprovado");
  });

  await test.step("conserta e entrega, com o pagamento dividido em duas formas", async () => {
    await avancar(page, "Começar o reparo", "Em reparo");
    await avancar(page, "Reparo pronto", "Pronto para retirada");

    await page.getByRole("button", { name: "Entregar ao cliente" }).click();
    const formas = page.getByRole("combobox", { name: "Forma de pagamento" });
    const valores = page.getByRole("textbox", { name: "Valor pago nessa forma" });
    await expect(page.getByRole("textbox", { name: /Valor cobrado/ })).toHaveValue("570,00");
    await expect(formas).toHaveValue("pix");
    await expect(valores).toHaveValue("570,00");

    await valores.fill("500,00");
    await page.getByRole("button", { name: "Dividir em outra forma" }).click();
    await expect(formas.nth(1)).toHaveValue("dinheiro");
    await expect(valores.nth(1)).toHaveValue("70,00");
    await avancar(page, "Confirmar entrega", "Entregue");

    await page.getByRole("tab", { name: /Histórico/ }).click();
    const historico = page.getByRole("tabpanel", { name: /Histórico/ });
    await expect(historico).toContainText("R$ 500,00 em PIX");
    await expect(historico).toContainText("R$ 70,00 em Dinheiro");
  });

  await test.step("gera o comprovante e o recibo em PDF", async () => {
    for (const documento of ["Comprovante", "Recibo"]) {
      const endereco = await page.getByRole("link", { name: documento, exact: true }).getAttribute("href");
      const resposta = await page.request.get(endereco!);
      expect(resposta.status(), documento).toBe(200);
      expect(resposta.headers()["content-type"], documento).toBe("application/pdf");
      expect((await resposta.body()).subarray(0, 5).toString(), documento).toBe("%PDF-");
    }
  });

  await test.step("o cliente acompanha pela página pública, sem entrar no sistema", async () => {
    const link = await page.getByRole("link", { name: "Ver como o cliente vê" }).getAttribute("href");
    await page.context().clearCookies();
    await page.goto(new URL(link!).pathname);

    await expect(page.getByRole("heading", { name: `Olá, ${CLIENTE.primeiroNome}!` })).toBeVisible();
    await expect(page.getByText(dono.assistencia, { exact: true })).toBeVisible();
    await expect(page.getByText("Aqui você acompanha o reparo do seu Samsung Galaxy A54.")).toBeVisible();

    const orcamento = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Orçamento aprovado" }),
    });
    await expect(orcamento).toContainText("Tela com moldura Galaxy A54");
    await expect(orcamento).toContainText("Mão de obra");
    await expect(orcamento).toContainText("R$ 570,00");

    await conferirFoto(page.getByRole("img", { name: LEGENDA_DA_FOTO }));

    const andamento = page.locator("section").filter({ has: page.getByRole("heading", { name: "Andamento" }) });
    for (const etapa of ETAPAS) await expect(andamento.getByText(etapa, { exact: true })).toBeVisible();

    await page.goto("/ordens");
    await expect(page).toHaveURL(/\/login$/);
  });
});
