"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import { entrar, type EstadoLogin } from "./acoes";

const INICIAL: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={acao} className="space-y-4">
      <CampoRotulado rotulo="Usuário" htmlFor="username">
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado rotulo="Senha" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={campo}
        />
      </CampoRotulado>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "w-full")}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
