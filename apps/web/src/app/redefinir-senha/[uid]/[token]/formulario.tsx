"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, link } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { redefinirSenha } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioDeNovaSenha({ uid, token }: { uid: string; token: string }) {
  const [estado, acao, enviando] = useActionState(redefinirSenha, INICIAL);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="uid" value={uid} />
      <input type="hidden" name="token" value={token} />

      <CampoRotulado
        rotulo="Nova senha"
        htmlFor="senha"
        erro={estado.erros?.senha}
        dica="Pelo menos 8 caracteres, sem ser só números nem parecida com o seu e-mail."
      >
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado rotulo="Repita a nova senha" htmlFor="confirmacao" erro={estado.erros?.confirmacao}>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          autoComplete="new-password"
          className={campo}
        />
      </CampoRotulado>

      {estado.erro && (
        <Mensagem tipo="erro">
          {estado.erro}{" "}
          <Link href="/esqueci-senha" className={link}>
            Pedir novo link
          </Link>
        </Mensagem>
      )}

      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "w-full")}>
        {enviando ? "Salvando..." : "Salvar e entrar"}
      </button>
    </form>
  );
}
