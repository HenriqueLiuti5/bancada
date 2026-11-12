"use server";

import { redirect } from "next/navigation";
import { abrirSessaoPor } from "@/lib/acesso";
import { estadoDeErro, senhaConfirmada, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function aceitarConvite(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const token = texto(dados, "token");
  const valores = { nome: texto(dados, "nome"), email: texto(dados, "email") };

  const { senha, erros } = senhaConfirmada(dados);
  if (erros) return { erros, valores };

  try {
    await abrirSessaoPor(`/api/publico/convites/${encodeURIComponent(token)}/aceitar/`, {
      ...valores,
      senha,
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível entrar na equipe.", valores);
  }

  redirect("/ordens");
}
