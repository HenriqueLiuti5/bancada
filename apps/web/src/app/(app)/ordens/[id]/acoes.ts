"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, enviarArquivo, mensagemDaApi } from "@/lib/api";
import { lerReais } from "@/lib/moeda";

export type EstadoTransicao = { erro?: string };
export type EstadoDaFoto = { erro?: string; enviada?: boolean };
export type EstadoDaSenha = { senha?: string; erro?: string; revelada?: boolean };
export type EstadoDosDetalhes = { erro?: string; salvo?: boolean };
export type EstadoDoItem = { erro?: string; adicionado?: boolean };
export type EstadoDaEntrega = { erro?: string };
export type EstadoDoRecebimento = { erro?: string; registrado?: boolean };

type PagamentoInformado = { forma: string; valor: string };

function pagamentosInformados(dados: FormData): PagamentoInformado[] | string {
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
    return { erro: mensagemDaApi(erro, "Não foi possível mudar o status.") };
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

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma foto do aparelho." };
  }

  const envio = new FormData();
  envio.set("arquivo", arquivo);
  envio.set("momento", String(dados.get("momento") ?? "entrada"));
  envio.set("legenda", String(dados.get("legenda") ?? ""));

  try {
    await enviarArquivo(`/api/ordens/${id}/fotos/`, envio);
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível enviar a foto.") };
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

export async function salvarDetalhes(
  _anterior: EstadoDosDetalhes,
  dados: FormData,
): Promise<EstadoDosDetalhes> {
  const id = String(dados.get("id"));
  const tecnico = String(dados.get("tecnico") ?? "");
  const prazo = String(dados.get("prometida_para") ?? "");

  const corpo = {
    tecnico: tecnico ? Number(tecnico) : null,
    prometida_para: prazo || null,
    diagnostico: String(dados.get("diagnostico") ?? ""),
    laudo: String(dados.get("laudo") ?? ""),
  };

  try {
    await chamarApi(`/api/ordens/${id}/`, { metodo: "PATCH", corpo });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível salvar os detalhes.") };
  }

  revalidatePath(`/ordens/${id}`);
  return { salvo: true };
}

export async function adicionarItem(
  _anterior: EstadoDoItem,
  dados: FormData,
): Promise<EstadoDoItem> {
  const id = String(dados.get("id"));
  const descricao = String(dados.get("descricao") ?? "").trim();
  const digitado = String(dados.get("valor") ?? "").trim();
  const valor = lerReais(digitado);

  if (!descricao) return { erro: "Descreva a peça ou o serviço." };
  if (!digitado) return { erro: "Informe o valor." };
  if (valor === null) return { erro: "Valor inválido. Escreva só o número, como 150,00." };

  try {
    await chamarApi(`/api/ordens/${id}/itens/`, {
      metodo: "POST",
      corpo: { tipo: String(dados.get("tipo") ?? "peca"), descricao, valor },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível adicionar o item.") };
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
  const valor = lerReais(String(dados.get("valor") ?? ""));
  if (valor === null || Number(valor) === 0) {
    return { erro: "Informe quanto o cliente pagou. Escreva só o número, como 150,00." };
  }

  try {
    await chamarApi(`/api/ordens/${id}/pagamentos/`, {
      metodo: "POST",
      corpo: { forma: String(dados.get("forma") ?? "pix"), valor },
    });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível registrar o pagamento.") };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return { registrado: true };
}

export async function removerPagamento(dados: FormData): Promise<void> {
  const id = String(dados.get("id"));
  const pagamento = String(dados.get("pagamento"));

  await chamarApi(`/api/pagamentos/${pagamento}/`, { metodo: "DELETE" });

  revalidatePath(`/ordens/${id}`);
}
