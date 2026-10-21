import { emReais } from "@/lib/moeda";
import type { ProdutoParaEscolher } from "@/lib/tipos";

// Com uma loja só, a quantidade do produto é a da loja. Com várias, cada loja tem a sua, e a que
// ainda não recebeu o produto tem zero.
export function quantidadeNaLoja(
  produto: ProdutoParaEscolher,
  loja: number | null,
  variasLojas: boolean,
): number {
  if (!variasLojas || loja === null) return produto.quantidade;
  return produto.por_loja[String(loja)] ?? 0;
}

export function textoDaQuantidade(quantidade: number): string {
  if (quantidade < 0) return `faltam ${-quantidade}`;
  if (quantidade === 0) return "sem estoque";
  return `${quantidade} em estoque`;
}

export function rotuloDoProduto(produto: ProdutoParaEscolher, quantidade: number): string {
  return `${produto.nome} · ${emReais(produto.preco)} · ${textoDaQuantidade(quantidade)}`;
}

export function lerQuantidade(digitado: string): number | null {
  const limpo = digitado.trim();
  return /^\d{1,6}$/.test(limpo) ? Number(limpo) : null;
}

export type LinhaVendida = { chave: number; produto: string; quantidade: string };

export function totalDaVenda(linhas: LinhaVendida[], produtos: ProdutoParaEscolher[]): number {
  const precos = new Map(produtos.map((produto) => [String(produto.id), Math.round(Number(produto.preco) * 100)]));
  return linhas.reduce((soma, linha) => {
    const preco = precos.get(linha.produto);
    const quantidade = lerQuantidade(linha.quantidade);
    if (preco === undefined || quantidade === null) return soma;
    return soma + preco * quantidade;
  }, 0);
}
