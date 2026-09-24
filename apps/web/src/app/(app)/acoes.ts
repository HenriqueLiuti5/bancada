"use server";

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
