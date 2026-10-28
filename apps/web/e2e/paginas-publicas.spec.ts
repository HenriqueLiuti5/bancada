import { QUALIDADE_DAS_CAPTURAS } from "../src/lib/capturas";
import { EMAIL_DE_CONTATO, RESPONSAVEL_PELO_BANCADA, VERSAO_DOS_TEXTOS_LEGAIS } from "../src/lib/textosLegais";
import { expect, test } from "./apoio";

const PAGINAS = [
  { caminho: "/", titulo: "Sua assistência organizada, do balcão à entrega" },
  { caminho: "/cadastro", titulo: "Crie a conta da sua assistência" },
  { caminho: "/login", titulo: "Entrar no Bancada" },
  { caminho: "/termos", titulo: "Termos de uso" },
  { caminho: "/privacidade", titulo: "Política de privacidade" },
];

for (const { caminho, titulo } of PAGINAS) {
  test(`${caminho} abre para quem não entrou`, async ({ page }) => {
    const resposta = await page.goto(caminho);
    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);

    // Rola até o fim para as imagens carregadas sob demanda também passarem pela CSP.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState("networkidle");
  });
}

for (const caminho of ["/termos", "/privacidade"]) {
  test(`${caminho} diz quem responde pelo Bancada e não tem trecho por decidir`, async ({ page }) => {
    await page.goto(caminho);
    const texto = page.getByRole("main");

    await expect(texto).toContainText(`Versão ${VERSAO_DOS_TEXTOS_LEGAIS}`);
    await expect(texto).toContainText(RESPONSAVEL_PELO_BANCADA);
    await expect(texto.getByRole("link", { name: EMAIL_DE_CONTATO }).first()).toHaveAttribute(
      "href",
      `mailto:${EMAIL_DE_CONTATO}`,
    );
    // O rascunho deixava entre colchetes o que faltava decidir.
    await expect(texto).not.toContainText("[");
  });
}

test("a página inicial diz até quando guarda a conta de quem não assina", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#preco")).toContainText("com tudo guardado por 6 meses");
  const pergunta = page.locator("details", { hasText: "O que acontece se eu não assinar?" });
  await pergunta.locator("summary").click();
  await expect(pergunta).toContainText("Se a conta passar 6 meses assim, ela é apagada");
});

// Sem a qualidade liberada no next.config.ts, o Next troca a pedida pela padrão, 75, sem erro.
test("a página inicial mostra as telas do sistema na qualidade das capturas", async ({ page }) => {
  await page.goto("/");
  const telas = page.getByRole("main").getByRole("img");
  await expect(telas).not.toHaveCount(0);

  for (const tela of await telas.all()) {
    await tela.scrollIntoViewIfNeeded();
    await expect.poll(() => tela.evaluate((imagem: HTMLImageElement) => imagem.naturalWidth)).toBeGreaterThan(0);
    const endereco = new URL(await tela.evaluate((imagem: HTMLImageElement) => imagem.currentSrc));
    expect(endereco.searchParams.get("q")).toBe(String(QUALIDADE_DAS_CAPTURAS));
  }
});

test("a página inicial mostra o dinheiro do painel, o estoque e o financeiro", async ({ page, isMobile }) => {
  await page.goto("/");
  // No celular, a abertura mostra só a página do cliente.
  await expect(page.getByRole("img", { name: /^Painel do Bancada com o dinheiro recebido/ })).toBeVisible({
    visible: !isMobile,
  });

  const recursos = page.locator("#recursos");
  for (const [titulo, tela] of [
    ["Você sabe o que tem na prateleira e o que falta comprar", /^Estoque do Bancada/],
    ["Você sabe quanto entrou, quanto saiu e quanto sobrou", /^Contas a pagar do Bancada/],
  ] as const) {
    const cabecalho = recursos.getByRole("heading", { name: titulo });
    await cabecalho.scrollIntoViewIfNeeded();
    await expect(cabecalho).toBeVisible();
    await expect(recursos.getByRole("img", { name: tela })).toBeVisible();
  }
});

test("a demonstração mostra cada etapa do conserto", async ({ page }) => {
  await page.goto("/demonstracao");
  const etapas = page.getByRole("navigation", { name: "Etapas do conserto" });

  for (const [botao, status] of [
    ["Recebido", "Recebido"],
    ["Orçamento", "Orçamento enviado"],
    ["Reparo", "Em reparo"],
    ["Pronto", "Pronto"],
    ["Entregue", "Entregue"],
  ]) {
    const link = etapas.getByRole("link", { name: botao, exact: true });
    await link.click();
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main").getByText(status, { exact: true }).first()).toBeVisible();
  }
});
