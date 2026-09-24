"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import type { ConvitePublico } from "@/lib/tipos";
import { aceitarConvite } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioDoConvite({ token, convite }: { token: string; convite: ConvitePublico }) {
  const [estado, acao, enviando] = useActionState(aceitarConvite, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? { nome: convite.nome, email: convite.email };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <CampoRotulado rotulo="Seu nome" htmlFor="nome" erro={erros.nome}>
        <input
          id="nome"
          name="nome"
          required
          autoComplete="name"
          defaultValue={valores.nome}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Seu e-mail"
        htmlFor="email"
        erro={erros.email}
        dica="É com ele que você vai entrar no sistema."
      >
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          defaultValue={valores.email}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Crie uma senha"
        htmlFor="senha"
        erro={erros.senha}
        dica="Pelo menos 8 caracteres, sem ser só números nem parecida com o seu e-mail."
      >
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="new-password"
          className={campo}
        />
      </CampoRotulado>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "w-full")}>
        {enviando ? "Entrando..." : "Entrar na equipe"}
      </button>
    </form>
  );
}
