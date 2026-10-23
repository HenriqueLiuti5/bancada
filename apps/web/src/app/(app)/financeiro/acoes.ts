"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import { lerReais } from "@/lib/moeda";

const ESCOLHA_A_FORMA = "Escolha como a conta foi paga.";

type Leitura = {
  valores: Record<string, string>;
  erros: Record<string, string>;
  corpo: Record<string, unknown>;
};

function marcado(dados: FormData, campo: string): boolean {
  return texto(dados, campo) === "sim";
}

function valorDaConta(digitado: string, erros: Record<string, string>): string | null {
  if (!digitado) {
    erros.valor = "Informe o valor da conta.";
    return null;
  }
  const valor = lerReais(digitado);
  if (valor === null) erros.valor = "Escreva só o número, como 150,00.";
  else if (Number(valor) === 0) erros.valor = "O valor precisa ser maior que zero.";
  return valor;
}

function lerConta(dados: FormData): Leitura {
  const valores = {
    descricao: texto(dados, "descricao"),
    categoria: texto(dados, "categoria"),
    valor: texto(dados, "valor"),
    vencimento: texto(dados, "vencimento"),
    fornecedor: texto(dados, "fornecedor"),
    loja: texto(dados, "loja"),
    observacao: texto(dados, "observacao"),
  };
  const erros: Record<string, string> = {};
  if (!valores.descricao) erros.descricao = "Escreva o que é a conta.";
  if (!valores.categoria) erros.categoria = "Escolha a categoria.";
  if (!valores.vencimento) erros.vencimento = "Informe o vencimento.";
  const corpo = {
    descricao: valores.descricao,
    categoria: valores.categoria,
    valor: valorDaConta(valores.valor, erros),
    vencimento: valores.vencimento,
    fornecedor: valores.fornecedor,
    loja: valores.loja ? Number(valores.loja) : null,
    observacao: valores.observacao,
  };
  return { valores, erros, corpo };
}

function semErros(erros: Record<string, string>): boolean {
  return Object.keys(erros).length === 0;
}

function revalidarAsContas() {
  revalidatePath("/financeiro", "layout");
  revalidatePath("/painel");
}

async function lancar(dados: FormData): Promise<EstadoDoFormulario | null> {
  const { valores, erros, corpo } = lerConta(dados);
  const paga = marcado(dados, "paga");
  const repetir = marcado(dados, "repetir");
  const pagamento = { paga_em: texto(dados, "paga_em"), forma: texto(dados, "forma") };
  const enviados = {
    ...valores,
    ...pagamento,
    paga: paga ? "sim" : "",
    repetir: repetir ? "sim" : "",
  };
  if (paga && !pagamento.forma) erros.forma = ESCOLHA_A_FORMA;
  if (!semErros(erros)) return { erros, valores: enviados };

  try {
    await chamarApi("/api/contas-a-pagar/", {
      metodo: "POST",
      corpo: {
        ...corpo,
        paga,
        paga_em: paga && pagamento.paga_em ? pagamento.paga_em : null,
        forma: paga ? pagamento.forma : "",
        repetir,
      },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível lançar a conta.", enviados);
  }

  revalidarAsContas();
  return null;
}

export async function lancarConta(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const recusa = await lancar(dados);
  if (recusa) return recusa;
  redirect("/financeiro?lancada=1");
}

// Quem não é dono não vê a lista: o formulário fica na tela, vazio para a próxima conta.
export async function lancarContaPelaEquipe(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const recusa = await lancar(dados);
  return recusa ?? { ok: "Conta lançada. O dono já vê a conta em Contas a pagar." };
}

export async function salvarConta(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { valores, erros, corpo } = lerConta(dados);
  const tambemNasProximas = marcado(dados, "tambem_nas_proximas");
  const enviados = { ...valores, tambem_nas_proximas: tambemNasProximas ? "sim" : "" };
  if (!semErros(erros)) return { erros, valores: enviados };

  try {
    await chamarApi(`/api/contas-a-pagar/${texto(dados, "id")}/`, {
      metodo: "PATCH",
      corpo: { ...corpo, tambem_nas_proximas: tambemNasProximas },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível salvar a conta.", enviados);
  }

  revalidarAsContas();
  return {
    ok: tambemNasProximas ? "Salvo, também nas próximas." : "Salvo.",
    valores: { ...valores, tambem_nas_proximas: "" },
  };
}

export async function pagarConta(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = {
    valor: texto(dados, "valor"),
    paga_em: texto(dados, "paga_em"),
    forma: texto(dados, "forma"),
  };
  const erros: Record<string, string> = {};
  const valor = valorDaConta(valores.valor, erros);
  if (!valores.forma) erros.forma = ESCOLHA_A_FORMA;
  if (!semErros(erros)) return { erros, valores };

  try {
    await chamarApi(`/api/contas-a-pagar/${texto(dados, "id")}/pagar/`, {
      metodo: "POST",
      corpo: { valor, paga_em: valores.paga_em || null, forma: valores.forma },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível registrar o pagamento.", valores);
  }

  revalidarAsContas();
  return { ok: "Pagamento registrado." };
}

export type EstadoSimples = { erro?: string };

async function acaoNaConta(
  dados: FormData,
  caminho: string,
  alternativa: string,
): Promise<EstadoSimples> {
  try {
    await chamarApi(`/api/contas-a-pagar/${texto(dados, "id")}/${caminho}`, { metodo: "POST" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, alternativa) };
  }

  revalidarAsContas();
  return {};
}

export async function desfazerPagamento(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  return acaoNaConta(dados, "desfazer-pagamento/", "Não foi possível desfazer o pagamento.");
}

export async function pararDeRepetir(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  return acaoNaConta(dados, "parar-de-repetir/", "Não foi possível parar a repetição.");
}

export async function removerConta(
  _anterior: EstadoSimples,
  dados: FormData,
): Promise<EstadoSimples> {
  try {
    await chamarApi(`/api/contas-a-pagar/${texto(dados, "id")}/`, { metodo: "DELETE" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível remover a conta.") };
  }

  revalidarAsContas();
  redirect("/financeiro?removida=1");
}
