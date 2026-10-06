"use client";

import { useActionState } from "react";
import { EnvelopeSimpleIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { pedirNovaSenha } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioEsqueciSenha() {
  const [estado, acao, enviando] = useActionState(pedirNovaSenha, INICIAL);

  if (estado.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-borda bg-realce px-6 py-8 text-center">
        <EnvelopeSimpleIcon size={44} weight="light" className="text-sucesso" />
        <p className="mt-4 text-[15px]">
          Se existir uma conta com <strong className="font-semibold">{estado.ok}</strong>, enviamos
          um link para criar uma nova senha.
        </p>
        <p className="mt-2 text-[13px] text-texto-apagado">
          O link vale por 2 horas. Olhe também a caixa de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <CampoRotulado rotulo="E-mail da sua conta" htmlFor="email" erro={estado.erros?.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          defaultValue={estado.valores?.email}
          className={campo}
        />
      </CampoRotulado>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button type="submit" disabled={enviando} className={juntar(botao("primario"), "w-full")}>
        {enviando ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}
