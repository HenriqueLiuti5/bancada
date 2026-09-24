"use server";

import { revalidatePath } from "next/cache";
import { chamarApi } from "@/lib/api";
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
