"use server";

import { revalidatePath } from "next/cache";
import { chamarApi, mensagemDaApi } from "@/lib/api";

export type EstadoDaEquipe = { erro?: string; ok?: string };

export async function criarUsuario(
  _anterior: EstadoDaEquipe,
  dados: FormData,
): Promise<EstadoDaEquipe> {
  const corpo = {
    username: String(dados.get("username") ?? "").trim(),
    first_name: String(dados.get("first_name") ?? "").trim(),
    email: String(dados.get("email") ?? "").trim(),
    papel: String(dados.get("papel") ?? ""),
    senha: String(dados.get("senha") ?? ""),
  };

  if (!corpo.username || !corpo.senha || !corpo.papel) {
    return { erro: "Preencha usuário, papel e senha." };
  }

  try {
    await chamarApi("/api/usuarios/", { metodo: "POST", corpo });
  } catch (erro) {
    return { erro: mensagemDaApi(erro, "Não foi possível criar o usuário.") };
  }

  revalidatePath("/equipe");
  return { ok: `${corpo.first_name || corpo.username} agora faz parte da equipe.` };
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
