"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, link } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { entrar } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={acao} className="space-y-4">
      <CampoRotulado rotulo="E-mail" htmlFor="email" erro={estado.erros?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          defaultValue={estado.valores?.email}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Senha"
        htmlFor="password"
        acessorio={
          <Link href="/esqueci-senha" className={juntar(link, "text-[13px]")}>
            Esqueci minha senha
          </Link>
        }
      >
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
