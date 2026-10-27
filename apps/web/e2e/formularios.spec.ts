import type { Page } from "@playwright/test";
import {
  abrirComOProblema,
  cartao,
  criarConta,
  diaDaquiA,
  donoNovo,
  expect,
  fotoDoAparelho,
  pularTour,
  test,
} from "./apoio";

// O React limpa o formulário depois de cada envio. Estes passos conferem cada formulário logo
// depois de salvar e depois de uma recusa, sem recarregar a página, porque é aí que um seletor ou
// uma caixa de marcar podia voltar ao valor de antes e o envio seguinte sair errado.

const PESSOA = "Rafael Teste";
const LEGENDA = "Tampa traseira riscada";
const NOTA_DA_APROVACAO = "Cliente vai pensar na tela.";
const OBSERVACAO = "Cliente levou o carregador junto.";
// Passa dos 10 MB que o site aceita por foto, e a recusa sai antes de enviar.
const FOTO_GRANDE_DEMAIS = Buffer.alloc(11 * 1024 * 1024);

async function avancar(page: Page, botao: string, etapa: string | RegExp): Promise<void> {
  await page.getByRole("button", { name: botao }).click();
  await expect(page.getByRole("heading", { name: etapa })).toBeVisible();
}

test("cada formulário mostra o que foi salvo e, quando o envio é recusado, continua com o que foi enviado", async ({
  page,
  browser,
}) => {
  const dono = donoNovo();
  const emailDaPessoa = dono.email.replace("paula-", "rafael-");

  await test.step("cria a conta", async () => {
    await criarConta(page, dono);
    await pularTour(page, "Boas-vindas ao Bancada");
  });

  await test.step("o convite recusado continua com o papel escolhido", async () => {
    await page.goto("/equipe");
    await pularTour(page, "Quem usa o sistema");
    const convite = cartao(page, "Convidar pessoa");
    const nome = convite.getByRole("textbox", { name: "Nome", exact: true });
    const papel = convite.getByRole("combobox", { name: "Papel" });
    const email = convite.getByRole("textbox", { name: "E-mail" });

    await nome.fill(PESSOA);
    await papel.selectOption({ label: "Atendente" });
    await email.fill(dono.email);
    await convite.getByRole("button", { name: "Criar convite" }).click();
    await expect(convite.getByText("Já existe uma conta com esse e-mail.")).toBeVisible();
    await expect(papel).toHaveValue("atendente");
    await expect(nome).toHaveValue(PESSOA);

    await email.fill(emailDaPessoa);
    await convite.getByRole("button", { name: "Criar convite" }).click();
    await expect(convite.getByText(`Convite criado para ${PESSOA}.`)).toBeVisible();
  });

  await test.step("a pessoa convidada entra na equipe pelo link", async () => {
    const link = await cartao(page, "Convidar pessoa").getByText(/\/convite\//).textContent();
    const contexto = await browser.newContext();
    const convidada = await contexto.newPage();
    await convidada.goto(new URL(new URL(link!).pathname, page.url()).href);
    await expect(convidada.getByRole("textbox", { name: "Seu e-mail" })).toHaveValue(emailDaPessoa);
    await convidada.getByLabel("Crie uma senha").fill(dono.senha);
    await convidada.getByRole("button", { name: "Entrar na equipe" }).click();
    await expect(convidada).toHaveURL(/\/ordens$/);
    await contexto.close();
  });

  await test.step("o papel trocado aparece na hora, sem recarregar a página", async () => {
    await page.reload();
    const papel = page.getByRole("combobox", { name: `Papel de ${PESSOA}` });
    await expect(papel).toHaveValue("atendente");

    await papel.selectOption({ label: "Técnico" });
    // O seletor fica desativado enquanto salva, e o formulário é limpo quando ele volta.
    await expect(papel).toBeDisabled();
    await expect(papel).toBeEnabled();
    await expect(papel).toHaveValue("tecnico");

    await page.reload();
    await expect(papel).toHaveValue("tecnico");
  });

  await test.step("o técnico escolhido na ficha da ordem aparece na hora", async () => {
    await page.goto("/ordens/nova");
    await pularTour(page, "Cliente");
    await page.getByRole("button", { name: "Cadastrar cliente novo" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Carla Mendes");
    await page.getByRole("textbox", { name: "Telefone / WhatsApp" }).fill("41988887777");
    await page.getByRole("textbox", { name: "Marca" }).fill("Xiaomi");
    await page.getByRole("textbox", { name: "Modelo" }).fill("Redmi Note 13");
    await abrirComOProblema(page, "A tela pisca e apaga sozinha.");
    await pularTour(page, "O que fazer agora");

    // Quem abre a ordem fica como técnico até alguém escolher outro.
    const tecnico = page.getByRole("combobox", { name: "Técnico responsável" });
    await expect(tecnico.locator("option:checked")).toHaveText(dono.nome);
    await tecnico.selectOption({ label: PESSOA });
    await expect(page.getByText("Salvo.", { exact: true })).toBeVisible();
    await expect(tecnico.locator("option:checked")).toHaveText(PESSOA);
  });

  await test.step("a foto recusada continua com o momento e a legenda", async () => {
    const momento = page.getByRole("combobox", { name: "Momento da foto" });
    const legenda = page.getByRole("textbox", { name: "Legenda" });
    const escolha = page.getByLabel(/Tirar ou escolher uma foto/);

    await momento.selectOption({ label: "Na entrega" });
    await legenda.fill(LEGENDA);
    await escolha.setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: FOTO_GRANDE_DEMAIS });
    await page.getByRole("button", { name: "Adicionar foto" }).click();
    await expect(page.getByText("A imagem passa de 10 MB.")).toBeVisible();
    await expect(momento).toHaveValue("saida");
    await expect(legenda).toHaveValue(LEGENDA);

    await escolha.setInputFiles({ name: "aparelho.png", mimeType: "image/png", buffer: fotoDoAparelho() });
    await page.getByRole("button", { name: "Adicionar foto" }).click();
    await expect(page.getByRole("figure").filter({ hasText: LEGENDA })).toContainText("Na entrega");
    await expect(momento).toHaveValue("entrada");
    await expect(legenda).toHaveValue("");
  });

  await test.step("o item recusado continua com o tipo, a descrição e o valor", async () => {
    await avancar(page, "Começar o diagnóstico", "Montar o orçamento");
    await page.getByRole("tab", { name: /Orçamento/ }).click();
    const orcamento = page.getByRole("tabpanel", { name: /Orçamento/ });
    const tipo = orcamento.getByRole("combobox", { name: "Tipo" });
    const descricao = orcamento.getByRole("textbox", { name: "Descrição" });
    const valor = orcamento.getByRole("textbox", { name: "Valor" });
    const adicionar = orcamento.getByRole("button", { name: "Adicionar" });

    await tipo.selectOption({ label: "Serviço" });
    await descricao.fill("Mão de obra");
    await valor.fill("noventa");
    await adicionar.click();
    await expect(orcamento.getByText("Valor inválido. Escreva só o número, como 150,00.")).toBeVisible();
    await expect(tipo).toHaveValue("servico");
    await expect(descricao).toHaveValue("Mão de obra");
    await expect(valor).toHaveValue("noventa");

    await valor.fill("90");
    await adicionar.click();
    await expect(orcamento.getByRole("listitem").filter({ hasText: "Mão de obra" })).toContainText("Serviço");
    await expect(tipo).toHaveValue("peca");
    await expect(descricao).toHaveValue("");

    await descricao.fill("Tela com moldura");
    await valor.fill("480");
    await adicionar.click();
    await expect(orcamento.getByRole("listitem")).toHaveCount(2);
  });

  await test.step("a aprovação recusada continua com os itens desmarcados", async () => {
    await avancar(page, "Enviar o orçamento ao cliente", "Esperando a resposta do cliente");
    await page.getByRole("button", { name: "O cliente aprovou" }).click();
    const aprovacao = page.getByRole("group", { name: "O que o cliente aprovou?" });
    const maoDeObra = aprovacao.getByRole("checkbox", { name: /Mão de obra/ });
    const tela = aprovacao.getByRole("checkbox", { name: /Tela com moldura/ });
    const nota = aprovacao.getByRole("textbox", { name: "Observação" });

    await maoDeObra.uncheck();
    await tela.uncheck();
    await nota.fill(NOTA_DA_APROVACAO);
    await page.getByRole("button", { name: "Confirmar a aprovação" }).click();
    await expect(
      page.getByText("Marque ao menos um item. Se o cliente recusou tudo, cancele e use “O cliente recusou”."),
    ).toBeVisible();
    await expect(maoDeObra).not.toBeChecked();
    await expect(tela).not.toBeChecked();
    await expect(nota).toHaveValue(NOTA_DA_APROVACAO);

    await maoDeObra.check();
    await avancar(page, "Confirmar a aprovação", "Orçamento aprovado");
    await page.getByRole("tab", { name: /Orçamento/ }).click();
    const orcamento = page.getByRole("tabpanel", { name: /Orçamento/ });
    await expect(orcamento.getByRole("listitem").filter({ hasText: "Tela com moldura" })).toContainText("recusado");
    await expect(orcamento.getByRole("listitem").filter({ hasText: "Mão de obra" })).toContainText("aprovado");
  });

  await test.step("a entrega recusada continua com a forma de pagamento e a observação", async () => {
    await avancar(page, "Começar o reparo", "Em reparo");
    await avancar(page, "Reparo pronto", "Pronto para retirada");
    await page.getByRole("button", { name: "Entregar ao cliente" }).click();
    const forma = page.getByRole("combobox", { name: "Forma de pagamento" });
    const observacao = page.getByRole("textbox", { name: "Observação" });
    await forma.selectOption({ label: "Dinheiro" });
    await observacao.fill(OBSERVACAO);

    // Outra pessoa da equipe entrega a ordem antes, deixando parte do valor para depois.
    const colega = await page.context().newPage();
    await colega.goto(page.url());
    await colega.getByRole("button", { name: "Entregar ao cliente" }).click();
    await colega.getByRole("textbox", { name: "Valor pago nessa forma" }).fill("50,00");
    await colega.getByLabel("Quando o cliente vai pagar o resto?").fill(diaDaquiA(2));
    await avancar(colega, "Confirmar entrega", /Falta receber/);
    await colega.close();

    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(
      page.getByText(
        "Esta ordem já está na etapa Entregue. Atualize a página para ver como ela está agora.",
      ),
    ).toBeVisible();
    await expect(forma).toHaveValue("dinheiro");
    await expect(observacao).toHaveValue(OBSERVACAO);
  });

  await test.step("o pagamento recusado continua com a forma e o valor", async () => {
    await page.reload();
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    const forma = page.getByRole("combobox", { name: "Forma", exact: true });
    const valor = page.getByRole("textbox", { name: "Valor pago", exact: true });
    await expect(valor).toHaveValue("40,00");

    await forma.selectOption({ label: "Débito" });
    await valor.fill("60,00");
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(page.getByText("O valor passa do que falta receber, que é R$ 40,00.")).toBeVisible();
    await expect(forma).toHaveValue("debito");
    await expect(valor).toHaveValue("60,00");

    await valor.fill("40,00");
    await avancar(page, "Registrar pagamento", "Entregue");
    await page.getByRole("tab", { name: /Histórico/ }).click();
    await expect(page.getByRole("tabpanel", { name: /Histórico/ })).toContainText("R$ 40,00 em Débito");
  });
});
