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
