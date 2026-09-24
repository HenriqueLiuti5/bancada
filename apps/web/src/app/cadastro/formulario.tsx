"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, link } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { cadastrar } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioDeCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {};

  return (
    <form action={acao} className="space-y-4">
      <CampoRotulado rotulo="Nome da assistência" htmlFor="assistencia" erro={erros.assistencia}>
        <input
          id="assistencia"
          name="assistencia"
          required
          autoFocus
          autoComplete="organization"
          defaultValue={valores.assistencia}
          className={campo}
        />
      </CampoRotulado>

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
        rotulo="E-mail"
        htmlFor="email"
        erro={erros.email}
        dica="É com ele que você entra no sistema e recupera a senha."
      >
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={valores.email}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="WhatsApp da assistência"
        htmlFor="whatsapp"
        erro={erros.whatsapp}
        dica="Com DDD. Também aparece para os seus clientes como telefone da loja."
      >
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          defaultValue={valores.whatsapp}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Senha"
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

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-[13px] text-texto-suave">
          <input
            type="checkbox"
            name="aceite_dos_termos"
            value="sim"
            required
            defaultChecked={valores.aceite_dos_termos === "sim"}
            className="mt-0.5 size-4 shrink-0 accent-primario"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" target="_blank" className={link}>
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" target="_blank" className={link}>
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {erros.aceite_dos_termos && (
          <p className="text-xs text-perigo-forte">{erros.aceite_dos_termos}</p>
        )}
      </div>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "w-full")}>
        {enviando ? "Criando a conta..." : "Criar conta grátis"}
      </button>
    </form>
  );
}
