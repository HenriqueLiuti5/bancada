"use server";

import { revalidatePath } from "next/cache";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

async function salvar(
  caminho: string,
  ordem: string,
  valores: Record<string, string>,
): Promise<EstadoDoFormulario> {
  try {
    await chamarApi(caminho, { metodo: "PATCH", corpo: valores });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível salvar.", valores);
  }

  revalidatePath(`/ordens/${ordem}`);
  revalidatePath("/ordens");
  return { ok: "Salvo.", valores };
}

export async function salvarCliente(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  return salvar(`/api/clientes/${texto(dados, "id")}/`, texto(dados, "ordem"), {
    nome: texto(dados, "nome"),
    telefone: texto(dados, "telefone"),
    email: texto(dados, "email"),
    documento: texto(dados, "documento"),
  });
}

export async function salvarAparelho(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  return salvar(`/api/aparelhos/${texto(dados, "id")}/`, texto(dados, "ordem"), {
    marca: texto(dados, "marca"),
    modelo: texto(dados, "modelo"),
    cor: texto(dados, "cor"),
    imei: texto(dados, "imei"),
  });
}
