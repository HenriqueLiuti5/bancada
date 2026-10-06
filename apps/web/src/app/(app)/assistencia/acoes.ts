"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, enviarArquivo, mensagemDaApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

async function salvar(
  caminho: string,
  valores: Record<string, string>,
): Promise<EstadoDoFormulario> {
  try {
    await chamarApi(caminho, { metodo: "PATCH", corpo: valores });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível salvar.", valores);
  }

  revalidatePath("/", "layout");
  return { ok: "Salvo.", valores };
}

export async function salvarAssistencia(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  return salvar("/api/assistencia/", {
    nome: texto(dados, "nome"),
    documento: texto(dados, "documento"),
    whatsapp: texto(dados, "whatsapp"),
  });
}

export async function salvarLoja(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  return salvar(`/api/lojas/${texto(dados, "id")}/`, {
    nome: texto(dados, "nome"),
    telefone: texto(dados, "telefone"),
    endereco: texto(dados, "endereco"),
  });
}

export type EstadoDaLogo = { ok?: string; erro?: string };

export async function enviarLogo(_anterior: EstadoDaLogo, dados: FormData): Promise<EstadoDaLogo> {
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha a imagem da logo." };
  }

  const envio = new FormData();
  envio.set("arquivo", arquivo);

  try {
    await enviarArquivo("/api/assistencia/logo/", envio);
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível enviar a logo.") };
  }

  revalidatePath("/assistencia");
  return { ok: "Logo salva." };
}

export async function removerLogo(): Promise<EstadoDaLogo> {
  try {
    await chamarApi("/api/assistencia/logo/", { metodo: "DELETE" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível remover a logo.") };
  }

  revalidatePath("/assistencia");
  return { ok: "Logo removida." };
}

export async function alterarLogo(anterior: EstadoDaLogo, dados: FormData): Promise<EstadoDaLogo> {
  return dados.get("acao") === "remover" ? removerLogo() : enviarLogo(anterior, dados);
}
