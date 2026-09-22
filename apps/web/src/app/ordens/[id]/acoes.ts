"use server";

import { revalidatePath } from "next/cache";
import { ErroDaApi, chamarApi } from "@/lib/api";

export type EstadoTransicao = { erro?: string };

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
    if (erro instanceof ErroDaApi) {
      const corpo = erro.corpo as { detail?: string } | null;
      return { erro: corpo?.detail ?? "Não foi possível mudar o status." };
    }
    return { erro: "Não foi possível falar com o servidor." };
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  return {};
}
