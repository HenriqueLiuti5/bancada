"use server";

import { redirect } from "next/navigation";
import { abrirSessaoPor } from "@/lib/acesso";
import { estadoDeErro, senhaConfirmada, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function redefinirSenha(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { senha, erros } = senhaConfirmada(dados);
  if (erros) return { erros };

  try {
    await abrirSessaoPor("/api/auth/senha/redefinir/", {
      uid: texto(dados, "uid"),
      token: texto(dados, "token"),
      senha,
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível trocar a senha.");
  }

  redirect("/ordens");
}
