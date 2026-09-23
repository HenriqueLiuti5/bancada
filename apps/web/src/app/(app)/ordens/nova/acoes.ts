"use server";

import { redirect } from "next/navigation";
import { chamarApi, mensagemDaApi } from "@/lib/api";
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
    return { erro: mensagemDaApi(erro, "Não foi possível abrir a ordem.") };
  }

  redirect(`/ordens/${criada.id}`);
}
