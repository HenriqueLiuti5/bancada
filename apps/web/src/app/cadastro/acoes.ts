"use server";

import { redirect } from "next/navigation";
import { abrirSessaoPor } from "@/lib/acesso";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";

export async function cadastrar(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const valores = {
    assistencia: texto(dados, "assistencia"),
    nome: texto(dados, "nome"),
    email: texto(dados, "email"),
    whatsapp: texto(dados, "whatsapp"),
  };
  const senha = String(dados.get("senha") ?? "");
  const aceite_dos_termos = dados.get("aceite_dos_termos") === "sim";

  try {
    await abrirSessaoPor("/api/auth/cadastro/", { ...valores, senha, aceite_dos_termos });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível criar a conta.", {
      ...valores,
      aceite_dos_termos: aceite_dos_termos ? "sim" : "",
    });
  }

  redirect("/ordens");
}
