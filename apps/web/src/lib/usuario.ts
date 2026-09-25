import { cache } from "react";
import { chamarApi } from "@/lib/api";
import type { Usuario, UsuarioAtual } from "@/lib/tipos";

export const usuarioAtual = cache(() => chamarApi<UsuarioAtual>("/api/auth/eu/"));

export function podeVerSenha(usuario: Usuario): boolean {
  return usuario.papel === "dono" || usuario.papel === "tecnico";
}

export function podeApagar(usuario: Usuario): boolean {
  return usuario.papel === "dono" || usuario.papel === "tecnico";
}

export function gerenciaEquipe(usuario: Usuario): boolean {
  return usuario.papel === "dono";
}

const ROTULOS_DOS_PAPEIS: Record<string, string> = {
  dono: "Dono",
  tecnico: "Técnico",
  atendente: "Atendente",
};

export function rotuloDoPapel(papel: string): string {
  return ROTULOS_DOS_PAPEIS[papel] ?? papel;
}
