"use server";

import { redirect } from "next/navigation";
import { abrirSessaoPor } from "@/lib/acesso";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import type { Sessao } from "@/lib/tipos";

export async function entrar(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const email = texto(dados, "email");
  const password = String(dados.get("password") ?? "");

  if (!email || !password) {
    return { erro: "Preencha e-mail e senha.", valores: { email } };
  }

  let sessao: Sessao;
  try {
    sessao = await abrirSessaoPor("/api/auth/login/", { email, password });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível entrar.", { email });
  }

  redirect(sessao.usuario.da_plataforma ? "/plataforma" : "/ordens");
}
