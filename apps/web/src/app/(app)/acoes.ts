"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import type { EstadoDoFormulario } from "@/lib/formularios";

export async function reenviarConfirmacao(): Promise<EstadoDoFormulario> {
  try {
    await chamarApi("/api/auth/email/reenviar/", { metodo: "POST" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível reenviar agora.") };
  }
  return { ok: "Link reenviado. Olhe também a caixa de spam." };
}

export async function marcarTourVisto(tour: string): Promise<void> {
  await chamarApi("/api/orientacao/tours/", { metodo: "POST", corpo: { tour } });
}

async function mudarPrimeirosPassos(escondidos: boolean): Promise<void> {
  await chamarApi("/api/orientacao/primeiros-passos/", {
    metodo: "PATCH",
    corpo: { escondidos },
  });
  revalidatePath("/", "layout");
}

export async function esconderPrimeirosPassos(): Promise<void> {
  await mudarPrimeirosPassos(true);
}

export async function mostrarPrimeirosPassos(): Promise<void> {
  await mudarPrimeirosPassos(false);
  redirect("/ordens");
}

export async function registrarLinkCompartilhado(id: number, meio: string): Promise<void> {
  await chamarApi(`/api/ordens/${id}/link-compartilhado/`, { metodo: "POST", corpo: { meio } });
}
