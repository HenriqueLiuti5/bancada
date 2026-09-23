"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, enviarArquivo, mensagemDaApi } from "@/lib/api";

export type EstadoTransicao = { erro?: string };
export type EstadoDaFoto = { erro?: string; enviada?: boolean };
export type EstadoDaSenha = { senha?: string; erro?: string; revelada?: boolean };

export async function transicionar(
  _anterior: EstadoTransicao,
  dados: FormData,
): Promise<EstadoTransicao> {
  const id = String(dados.get("id"));
  const status = String(dados.get("status"));
  const nota = String(dados.get("nota") ?? "");

  try {
    await chamarApi(`/api/ordens/${id}/transicionar/`, {
      metodo: "POST",
      corpo: { status, nota },
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
