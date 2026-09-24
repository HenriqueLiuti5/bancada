"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, enviarArquivo, mensagemDaApi } from "@/lib/api";
import { lerReais } from "@/lib/moeda";

export type EstadoTransicao = { erro?: string };
export type EstadoDaFoto = { erro?: string; enviada?: boolean };
export type EstadoDaSenha = { senha?: string; erro?: string; revelada?: boolean };
export type EstadoDosDetalhes = { erro?: string; salvo?: boolean };
export type EstadoDoItem = { erro?: string; adicionado?: boolean };

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
