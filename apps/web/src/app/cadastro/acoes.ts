"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { abrirSessaoPor } from "@/lib/acesso";
import { cabecalhosDoVisitante, contarCadastro } from "@/lib/estatisticas";
import { estadoDeErro, senhaConfirmada, texto, type EstadoDoFormulario } from "@/lib/formularios";

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
  const aceite_dos_termos = dados.get("aceite_dos_termos") === "sim";
  const doFormulario = { ...valores, aceite_dos_termos: aceite_dos_termos ? "sim" : "" };

  const { senha, erros } = senhaConfirmada(dados);
  if (erros) return { erros, valores: doFormulario };

  try {
    await abrirSessaoPor("/api/auth/cadastro/", { ...valores, senha, aceite_dos_termos });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível criar a conta.", doFormulario);
  }

  const visitante = await cabecalhosDoVisitante();
  after(() => contarCadastro(visitante));
  redirect("/ordens");
}
