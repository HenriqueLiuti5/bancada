"use server";

import { redirect } from "next/navigation";
import { abrirSessaoPor } from "@/lib/acesso";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function redefinirSenha(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const senha = String(dados.get("senha") ?? "");
  const confirmacao = String(dados.get("confirmacao") ?? "");

  if (senha !== confirmacao) {
    return { erros: { confirmacao: "As duas senhas não são iguais." } };
  }

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
