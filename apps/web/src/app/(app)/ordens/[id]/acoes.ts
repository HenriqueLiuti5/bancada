"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, enviarArquivo, mensagemDaApi } from "@/lib/api";
import { lerReais } from "@/lib/moeda";
import { pagamentosInformados } from "@/lib/pagamentos";

export type EstadoTransicao = { erro?: string; nota?: string; aprovados?: number[] };
export type EstadoDaFoto = { erro?: string; enviada?: boolean; valores?: Record<string, string> };
export type EstadoDaSenha = { senha?: string; erro?: string; revelada?: boolean };
export type EstadoDaCorrecaoDaSenha = { senha?: string; erro?: string };
export type EstadoDasAnotacoes = { erro?: string; salvo?: boolean; valores?: Record<string, string> };
export type EstadoDaFicha = { erro?: string; salvo?: boolean };
export type EstadoDoItem = { erro?: string; adicionado?: boolean; valores?: Record<string, string> };
export type EstadoDaEntrega = { erro?: string };
export type EstadoDoRecebimento = {
  erro?: string;
  registrado?: boolean;
  valores?: Record<string, string>;
};
export type EstadoDoComentario = { erro?: string; texto?: string };

export async function transicionar(
  _anterior: EstadoTransicao,
  dados: FormData,
): Promise<EstadoTransicao> {
  const id = String(dados.get("id"));
  const status = String(dados.get("status"));
  const nota = String(dados.get("nota") ?? "");
  const escolheuItens = status === "aprovado" && dados.get("escolha_de_itens") === "sim";
  const itensAprovados = dados.getAll("itens_aprovados").map(Number);

  try {
    await chamarApi(`/api/ordens/${id}/transicionar/`, {
      metodo: "POST",
      corpo: escolheuItens ? { status, nota, itens_aprovados: itensAprovados } : { status, nota },
    });
  } catch (erro) {
    return {
      erro: mensagemDaApi(erro, "Não foi possível mudar o status."),
      nota,
      aprovados: escolheuItens ? itensAprovados : undefined,
    };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return {};
}

export async function enviarFoto(
  _anterior: EstadoDaFoto,
  dados: FormData,
): Promise<EstadoDaFoto> {
  const id = String(dados.get("id"));
  const arquivo = dados.get("arquivo");
  const valores = {
    momento: String(dados.get("momento") ?? "entrada"),
    legenda: String(dados.get("legenda") ?? ""),
  };

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma foto do aparelho.", valores };
  }

  const envio = new FormData();
  envio.set("arquivo", arquivo);
  envio.set("momento", valores.momento);
  envio.set("legenda", valores.legenda);

  try {
    await enviarArquivo(`/api/ordens/${id}/fotos/`, envio);
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível enviar a foto."), valores };
  }

  revalidatePath(`/ordens/${id}`);
  return { enviada: true };
}

export async function apagarFoto(dados: FormData): Promise<void> {
  const id = String(dados.get("id"));
  const foto = String(dados.get("foto"));

  await chamarApi(`/api/fotos/${foto}/`, { metodo: "DELETE" });

  revalidatePath(`/ordens/${id}`);
}

export async function alternarVisibilidade(dados: FormData): Promise<void> {
  const id = String(dados.get("id"));
  const foto = String(dados.get("foto"));
  const visivel = dados.get("visivel") === "sim";

  await chamarApi(`/api/fotos/${foto}/`, {
    metodo: "PATCH",
    corpo: { visivel_ao_cliente: !visivel },
  });

  revalidatePath(`/ordens/${id}`);
}

export async function verSenhaDoAparelho(
  _anterior: EstadoDaSenha,
  dados: FormData,
): Promise<EstadoDaSenha> {
  const aparelho = String(dados.get("aparelho"));

  try {
    const resposta = await chamarApi<{ senha_desbloqueio: string }>(
      `/api/aparelhos/${aparelho}/senha/`,
    );
    return { senha: resposta.senha_desbloqueio, revelada: true };
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível ver a senha de desbloqueio.") };
  }
}

export async function corrigirSenhaDoAparelho(
  _anterior: EstadoDaCorrecaoDaSenha,
  dados: FormData,
): Promise<EstadoDaCorrecaoDaSenha> {
  const aparelho = String(dados.get("aparelho"));
  const senha = String(dados.get("senha_desbloqueio") ?? "").trim();

  try {
    await chamarApi(`/api/aparelhos/${aparelho}/`, {
      metodo: "PATCH",
      corpo: { senha_desbloqueio: senha },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível corrigir a senha de desbloqueio.") };
  }

  return { senha };
}

export async function salvarAnotacoes(
  _anterior: EstadoDasAnotacoes,
  dados: FormData,
): Promise<EstadoDasAnotacoes> {
  const id = String(dados.get("id"));
  const corpo = {
    diagnostico: String(dados.get("diagnostico") ?? ""),
    laudo: String(dados.get("laudo") ?? ""),
  };

  try {
    await chamarApi(`/api/ordens/${id}/`, { metodo: "PATCH", corpo });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível salvar as anotações."), valores: corpo };
  }

  revalidatePath(`/ordens/${id}`);
  return { salvo: true };
}

function valorDaFicha(campo: string, digitado: string): number | string | null {
  if (campo === "tecnico") return digitado ? Number(digitado) : null;
  return digitado || null;
}

export async function salvarNaFicha(
  _anterior: EstadoDaFicha,
  dados: FormData,
): Promise<EstadoDaFicha> {
  const id = String(dados.get("id"));
  const campo = String(dados.get("campo"));
  if (campo !== "tecnico" && campo !== "prometida_para") return { erro: "Campo desconhecido." };

  const valor = valorDaFicha(campo, String(dados.get("valor") ?? ""));

  try {
    await chamarApi(`/api/ordens/${id}/`, { metodo: "PATCH", corpo: { [campo]: valor } });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível salvar.") };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return { salvo: true };
}

export async function adicionarItem(
  _anterior: EstadoDoItem,
  dados: FormData,
): Promise<EstadoDoItem> {
  const id = String(dados.get("id"));
  const produto = String(dados.get("produto") ?? "");
  const tipo = produto ? "peca" : String(dados.get("tipo") ?? "peca");
  const descricao = String(dados.get("descricao") ?? "").trim();
  const digitado = String(dados.get("valor") ?? "").trim();
  const custoDigitado = produto ? "" : String(dados.get("custo") ?? "").trim();
  const valor = lerReais(digitado);
  const custo = custoDigitado ? lerReais(custoDigitado) : null;
  const valores = { produto, tipo, descricao, valor: digitado, custo: custoDigitado };

  if (!descricao) return { erro: "Descreva a peça ou o serviço.", valores };
  if (!digitado) return { erro: "Informe o valor.", valores };
  if (valor === null) return { erro: "Valor inválido. Escreva só o número, como 150,00.", valores };
  if (custoDigitado && custo === null) {
    return { erro: "Custo inválido. Escreva só o número, como 90,00.", valores };
  }

  const corpo = produto
    ? { produto: Number(produto), descricao, valor }
    : { tipo, descricao, valor, custo };

  try {
    await chamarApi(`/api/ordens/${id}/itens/`, { metodo: "POST", corpo });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível adicionar o item."), valores };
  }

  revalidatePath(`/ordens/${id}`);
  return { adicionado: true };
}

export async function apagarItem(dados: FormData): Promise<void> {
  const id = String(dados.get("id"));
  const item = String(dados.get("item"));

  await chamarApi(`/api/itens/${item}/`, { metodo: "DELETE" });

  revalidatePath(`/ordens/${id}`);
}

export async function entregar(
  _anterior: EstadoDaEntrega,
  dados: FormData,
): Promise<EstadoDaEntrega> {
  const id = String(dados.get("id"));
  const valorCobrado = lerReais(String(dados.get("valor_cobrado") ?? ""));
  if (valorCobrado === null) return { erro: "Informe o valor cobrado. Escreva só o número." };

  const pagamentos = pagamentosInformados(dados);
  if (typeof pagamentos === "string") return { erro: pagamentos };

  try {
    await chamarApi(`/api/ordens/${id}/transicionar/`, {
      metodo: "POST",
      corpo: {
        status: "entregue",
        nota: String(dados.get("nota") ?? ""),
        cobranca: { valor_cobrado: valorCobrado, pagamentos },
      },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível registrar a entrega.") };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return {};
}

export async function receberPagamento(
  _anterior: EstadoDoRecebimento,
  dados: FormData,
): Promise<EstadoDoRecebimento> {
  const id = String(dados.get("id"));
  const forma = String(dados.get("forma") ?? "pix");
  const digitado = String(dados.get("valor") ?? "");
  const valor = lerReais(digitado);
  const valores = { forma, valor: digitado };
  if (valor === null || Number(valor) === 0) {
    return { erro: "Informe quanto o cliente pagou. Escreva só o número, como 150,00.", valores };
  }

  try {
    await chamarApi(`/api/ordens/${id}/pagamentos/`, {
      metodo: "POST",
      corpo: { forma, valor },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível registrar o pagamento."), valores };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return { registrado: true };
}

export async function comentar(
  _anterior: EstadoDoComentario,
  dados: FormData,
): Promise<EstadoDoComentario> {
  const id = String(dados.get("id"));
  const texto = String(dados.get("texto") ?? "").trim();
  if (!texto) return { erro: "Escreva o comentário antes de enviar." };

  try {
    await chamarApi(`/api/ordens/${id}/comentarios/`, { metodo: "POST", corpo: { texto } });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível enviar o comentário."), texto };
  }

  revalidatePath(`/ordens/${id}`);
  return { texto: "" };
}

export async function removerPagamento(dados: FormData): Promise<void> {
  const id = String(dados.get("id"));
  const pagamento = String(dados.get("pagamento"));

  await chamarApi(`/api/pagamentos/${pagamento}/`, { metodo: "DELETE" });

  revalidatePath(`/ordens/${id}`);
}
