"use server";

import { redirect } from "next/navigation";
import { ErroDaApi, chamarApi } from "@/lib/api";
import { gravarToken } from "@/lib/sessao";
import type { Usuario } from "@/lib/tipos";

export type EstadoLogin = { erro?: string };

export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const username = String(dados.get("username") ?? "").trim();
  const password = String(dados.get("password") ?? "");

  if (!username || !password) {
    return { erro: "Preencha usuário e senha." };
  }

  try {
    const resposta = await chamarApi<{ token: string; usuario: Usuario }>("/api/auth/login/", {
      metodo: "POST",
      corpo: { username, password },
      autenticado: false,
    });
    await gravarToken(resposta.token);
  } catch (erro) {
    if (erro instanceof ErroDaApi) {
      const corpo = erro.corpo as { detail?: string } | null;
      return { erro: corpo?.detail ?? "Não foi possível entrar." };
    }
    return { erro: "Não foi possível falar com o servidor." };
  }

  redirect("/ordens");
}
