"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import type { Convite } from "@/lib/tipos";

export type EstadoDaEquipe = { erro?: string; ok?: string };

export type EstadoDoConvite = EstadoDoFormulario & { convite?: Convite };

export async function criarConvite(
  _anterior: EstadoDoConvite,
  dados: FormData,
): Promise<EstadoDoConvite> {
  const valores = {
    nome: texto(dados, "nome"),
    papel: texto(dados, "papel"),
    email: texto(dados, "email"),
  };

  let convite: Convite;
  try {
    convite = await chamarApi<Convite>("/api/convites/", { metodo: "POST", corpo: valores });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível criar o convite.", valores);
  }

  revalidatePath("/equipe");
  return { convite };
}

export async function cancelarConvite(id: number): Promise<void> {
  await chamarApi(`/api/convites/${id}/`, { metodo: "DELETE" });
  revalidatePath("/equipe");
}

export async function alterarUsuario(
  _anterior: EstadoDaEquipe,
  dados: FormData,
): Promise<EstadoDaEquipe> {
  const id = String(dados.get("id"));
  const corpo: Record<string, string | boolean> = {};

  const papel = dados.get("papel");
  if (typeof papel === "string" && papel) corpo.papel = papel;

  const ativo = dados.get("ativo");
  if (ativo === "sim" || ativo === "nao") corpo.is_active = ativo === "sim";

  try {
    await chamarApi(`/api/usuarios/${id}/`, { metodo: "PATCH", corpo });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível alterar o usuário.") };
  }

  revalidatePath("/equipe");
  return {};
}

export async function redefinirSenha(
  _anterior: EstadoDaEquipe,
  dados: FormData,
): Promise<EstadoDaEquipe> {
  const id = String(dados.get("id"));
  const senha = String(dados.get("senha") ?? "");

  if (!senha) return { erro: "Digite a nova senha." };

  try {
    await chamarApi(`/api/usuarios/${id}/senha/`, { metodo: "POST", corpo: { senha } });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível redefinir a senha.") };
  }

  return { ok: "Senha redefinida. A sessão antiga dessa pessoa foi encerrada." };
}
