import { lerReais } from "@/lib/moeda";
import type { Opcao } from "@/lib/tipos";

export const FORMAS_DE_PAGAMENTO: Opcao[] = [
  { valor: "pix", rotulo: "PIX" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
];

export type PagamentoInformado = { forma: string; valor: string };

// Lê as linhas "forma" e "valor_pago" do formulário, na ordem em que aparecem na tela.
export function pagamentosInformados(dados: FormData): PagamentoInformado[] | string {
  const formas = dados.getAll("forma").map(String);
  const valores = dados.getAll("valor_pago").map(String);
  const pagamentos: PagamentoInformado[] = [];

  for (const [indice, forma] of formas.entries()) {
    const valor = lerReais(valores[indice] ?? "");
    if (valor === null) return "Um dos pagamentos está com valor inválido. Escreva só o número.";
    if (Number(valor) === 0) return "Cada pagamento precisa ter valor maior que zero.";
    pagamentos.push({ forma, valor });
  }
  return pagamentos;
}
