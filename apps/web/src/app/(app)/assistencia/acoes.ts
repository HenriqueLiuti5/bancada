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
    fuso_horario: texto(dados, "fuso_horario"),
  });
}

function dadosDaLoja(dados: FormData): Record<string, string> {
  return {
    nome: texto(dados, "nome"),
    telefone: texto(dados, "telefone"),
    endereco: texto(dados, "endereco"),
  };
}

export async function salvarLoja(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  return salvar(`/api/lojas/${texto(dados, "id")}/`, dadosDaLoja(dados));
}

export async function criarLoja(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = dadosDaLoja(dados);

  try {
    await chamarApi("/api/lojas/", { metodo: "POST", corpo: valores });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível criar a loja.", valores);
  }

  revalidatePath("/", "layout");
  return { ok: "Loja criada." };
}

export type EstadoDaLoja = { erro?: string };

export async function ativarOuDesativarLoja(
  _anterior: EstadoDaLoja,
  dados: FormData,
): Promise<EstadoDaLoja> {
  const ativa = texto(dados, "ativa") === "sim";

  try {
    await chamarApi(`/api/lojas/${texto(dados, "id")}/`, { metodo: "PATCH", corpo: { ativa } });
  } catch (erro) {
    const alternativa = ativa
      ? "Não foi possível reativar a loja."
      : "Não foi possível desativar a loja.";
    return { erro: mensagemDaApi(erro, alternativa) };
  }

  revalidatePath("/", "layout");
  return {};
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
