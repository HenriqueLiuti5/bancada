"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function assinar(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = { documento: texto(dados, "documento") };

  try {
    await chamarApi("/api/assinatura/assinar/", { metodo: "POST", corpo: valores });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível assinar agora.", valores);
  }

  revalidatePath("/", "layout");
  return { ok: "Assinatura feita." };
}

export async function cancelarAssinatura(): Promise<EstadoDoFormulario> {
  try {
    await chamarApi("/api/assinatura/cancelar/", { metodo: "POST" });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível cancelar agora.") };
  }

  revalidatePath("/", "layout");
  return { ok: "Assinatura cancelada." };
}
