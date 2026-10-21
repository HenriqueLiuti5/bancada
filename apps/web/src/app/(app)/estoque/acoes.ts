"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import { lerQuantidade } from "@/lib/estoque";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import { lerReais } from "@/lib/moeda";
import { pagamentosInformados } from "@/lib/pagamentos";
import type { Produto, Venda } from "@/lib/tipos";

const ESCREVA_O_VALOR = "Escreva só o número, como 150,00.";
const ESCREVA_A_QUANTIDADE = "Escreva a quantidade só com números.";

type Leitura = {
  valores: Record<string, string>;
  erros: Record<string, string>;
  corpo: Record<string, unknown>;
};

function dinheiro(digitado: string, erros: Record<string, string>, campo: string): string | null {
  if (!digitado) return "0";
  const valor = lerReais(digitado);
  if (valor === null) erros[campo] = ESCREVA_O_VALOR;
  return valor;
}

function quantidade(digitado: string, erros: Record<string, string>, campo: string): number | null {
  if (!digitado) return 0;
  const valor = lerQuantidade(digitado);
  if (valor === null) erros[campo] = ESCREVA_A_QUANTIDADE;
  return valor;
}

function lerProduto(dados: FormData): Leitura {
  const valores = {
    nome: texto(dados, "nome"),
    tipo: texto(dados, "tipo") || "peca",
    codigo: texto(dados, "codigo"),
    custo: texto(dados, "custo"),
    preco: texto(dados, "preco"),
    minimo: texto(dados, "minimo"),
  };
  const erros: Record<string, string> = {};
  if (!valores.nome) erros.nome = "Escreva o nome do produto.";
  const corpo = {
    nome: valores.nome,
    tipo: valores.tipo,
    codigo: valores.codigo,
    custo: dinheiro(valores.custo, erros, "custo"),
    preco: dinheiro(valores.preco, erros, "preco"),
    minimo: quantidade(valores.minimo, erros, "minimo"),
  };
  return { valores, erros, corpo };
}

function semErros(erros: Record<string, string>): boolean {
  return Object.keys(erros).length === 0;
}

export async function criarProduto(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { valores, erros, corpo } = lerProduto(dados);
  const inicial = { quantidade: texto(dados, "quantidade"), loja: texto(dados, "loja") };
  const todos = { ...valores, ...inicial };
  const quantidadeInicial = quantidade(inicial.quantidade, erros, "quantidade");
  if (!semErros(erros)) return { erros, valores: todos };

  let produto: Produto;
  try {
    produto = await chamarApi<Produto>("/api/produtos/", {
      metodo: "POST",
      corpo: {
        ...corpo,
        quantidade: quantidadeInicial,
        loja: inicial.loja ? Number(inicial.loja) : null,
      },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível cadastrar o produto.", todos);
  }

  revalidatePath("/estoque");
  redirect(`/estoque/${produto.id}`);
}

export async function salvarProduto(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { valores, erros, corpo } = lerProduto(dados);
  if (!semErros(erros)) return { erros, valores };

  const id = texto(dados, "id");
  try {
    await chamarApi(`/api/produtos/${id}/`, { metodo: "PATCH", corpo });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível salvar o produto.", valores);
  }

  revalidatePath("/estoque", "layout");
  return { ok: "Salvo.", valores };
}

export type EstadoSimples = { erro?: string };

export async function ativarOuDesativarProduto(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  const ativo = texto(dados, "ativo") === "sim";
  try {
    await chamarApi(`/api/produtos/${texto(dados, "id")}/`, { metodo: "PATCH", corpo: { ativo } });
  } catch (erro) {
    const alternativa = ativo
      ? "Não foi possível reativar o produto."
      : "Não foi possível desativar o produto.";
    return { erro: mensagemDaApi(erro, alternativa) };
  }

  revalidatePath("/estoque", "layout");
  return {};
}

async function movimentar(
  dados: FormData,
  acao: string,
  corpo: Record<string, unknown>,
  valores: Record<string, string>,
  mensagens: { ok: string; erro: string },
): Promise<EstadoDoFormulario> {
  try {
    await chamarApi(`/api/produtos/${texto(dados, "id")}/${acao}/`, { metodo: "POST", corpo });
  } catch (erro) {
    return estadoDeErro(erro, mensagens.erro, valores);
  }

  revalidatePath("/estoque", "layout");
  return { ok: mensagens.ok };
}

function lojaEscolhida(dados: FormData, campo = "loja"): number | null {
  const loja = texto(dados, campo);
  return loja ? Number(loja) : null;
}

export async function registrarEntrada(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = {
    loja: texto(dados, "loja"),
    quantidade: texto(dados, "quantidade"),
    custo_unitario: texto(dados, "custo_unitario"),
    fornecedor: texto(dados, "fornecedor"),
  };
  const erros: Record<string, string> = {};
  const recebida = lerQuantidade(valores.quantidade);
  if (!recebida) erros.quantidade = "Informe quantas unidades chegaram.";
  const custo = valores.custo_unitario ? lerReais(valores.custo_unitario) : null;
  if (custo === null) erros.custo_unitario = "Informe quanto custou cada unidade, como 150,00.";
  if (!semErros(erros)) return { erros, valores };

  return movimentar(
    dados,
    "entrada",
    {
      loja: lojaEscolhida(dados),
      quantidade: recebida,
      custo_unitario: custo,
      fornecedor: valores.fornecedor,
    },
    valores,
    { ok: "Entrada registrada.", erro: "Não foi possível registrar a entrada." },
  );
}

export async function corrigirContagem(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = {
    loja: texto(dados, "loja"),
    contada: texto(dados, "contada"),
    observacao: texto(dados, "observacao"),
  };
  const contada = lerQuantidade(valores.contada);
  if (contada === null) {
    return { erros: { contada: "Informe quantas unidades você contou." }, valores };
  }

  return movimentar(
    dados,
    "contagem",
    { loja: lojaEscolhida(dados), contada, observacao: valores.observacao },
    valores,
    { ok: "Contagem salva.", erro: "Não foi possível salvar a contagem." },
  );
}

export async function transferir(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = {
    de: texto(dados, "de"),
    para: texto(dados, "para"),
    quantidade: texto(dados, "quantidade"),
  };
  const levada = lerQuantidade(valores.quantidade);
  if (!levada) {
    return { erros: { quantidade: "Informe quantas unidades vão para a outra loja." }, valores };
  }

  return movimentar(
    dados,
    "transferencia",
    { de: lojaEscolhida(dados, "de"), para: lojaEscolhida(dados, "para"), quantidade: levada },
    valores,
    { ok: "Transferência registrada.", erro: "Não foi possível transferir." },
  );
}

export async function registrarVenda(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  const produtos = dados.getAll("produto").map(String);
  const quantidades = dados.getAll("quantidade").map(String);
  const itens: { produto: number; quantidade: number }[] = [];
  for (const [indice, produto] of produtos.entries()) {
    if (!produto) continue;
    const vendida = lerQuantidade(quantidades[indice] ?? "");
    if (!vendida) return { erro: "Informe a quantidade de cada produto, só com números." };
    itens.push({ produto: Number(produto), quantidade: vendida });
  }
  if (itens.length === 0) return { erro: "Escolha ao menos um produto." };

  const valorCobrado = lerReais(texto(dados, "valor_cobrado"));
  if (valorCobrado === null) return { erro: "Informe o valor cobrado. Escreva só o número." };

  const pagamentos = pagamentosInformados(dados);
  if (typeof pagamentos === "string") return { erro: pagamentos };

  let venda: Venda;
  try {
    venda = await chamarApi<Venda>("/api/vendas/", {
      metodo: "POST",
      corpo: {
        loja: lojaEscolhida(dados),
        itens,
        valor_cobrado: valorCobrado,
        pagamentos,
        observacao: texto(dados, "observacao"),
      },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível registrar a venda.") };
  }

  revalidatePath("/estoque", "layout");
  redirect(`/estoque/vendas/${venda.id}?registrada=1`);
}

export async function desfazerVenda(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  try {
    await chamarApi(`/api/vendas/${texto(dados, "id")}/desfazer/`, { metodo: "POST" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível desfazer a venda.") };
  }

  revalidatePath("/estoque", "layout");
  return {};
}
