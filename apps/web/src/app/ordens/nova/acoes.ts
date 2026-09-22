"use server";

import { redirect } from "next/navigation";
import { ErroDaApi, chamarApi } from "@/lib/api";
import type { Ordem } from "@/lib/tipos";

export type EstadoAbertura = { erro?: string };

export async function abrirOrdem(
  _anterior: EstadoAbertura,
  dados: FormData,
): Promise<EstadoAbertura> {
  const loja = Number(dados.get("loja"));
  const cliente = Number(dados.get("cliente"));
  const aparelho = Number(dados.get("aparelho"));
  const problema_relatado = String(dados.get("problema_relatado") ?? "").trim();

  if (!loja || !cliente || !aparelho || !problema_relatado) {
    return { erro: "Preencha todos os campos." };
  }

  let criada: Ordem;
  try {
    criada = await chamarApi<Ordem>("/api/ordens/", {
      metodo: "POST",
      corpo: { loja, cliente, aparelho, problema_relatado },
    });
  } catch (erro) {
    if (erro instanceof ErroDaApi) {
      const corpo = erro.corpo as Record<string, string[] | string> | null;
      const primeira = corpo ? Object.values(corpo)[0] : null;
      const mensagem = Array.isArray(primeira) ? primeira[0] : primeira;
      return { erro: mensagem ?? "Não foi possível abrir a ordem." };
    }
    return { erro: "Não foi possível falar com o servidor." };
  }

  redirect(`/ordens/${criada.id}`);
}
