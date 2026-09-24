"use server";

import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function pedirNovaSenha(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const email = texto(dados, "email");
  if (!email) return { erros: { email: "Digite o e-mail da sua conta." } };

  try {
    await chamarApi("/api/auth/senha/esqueci/", {
      metodo: "POST",
      corpo: { email },
      autenticado: false,
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível enviar o link agora.", { email });
  }

  return { ok: email };
}
