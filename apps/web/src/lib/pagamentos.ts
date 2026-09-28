import type { Opcao } from "@/lib/tipos";

export const FORMAS_DE_PAGAMENTO: Opcao[] = [
  { valor: "pix", rotulo: "PIX" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
];
