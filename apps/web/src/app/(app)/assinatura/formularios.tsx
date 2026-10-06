"use client";

import { useActionState, useState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { emReais } from "@/lib/moeda";
import { assinar, cancelarAssinatura } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

type PropsDaAssinatura = { documento: string; valorMensal: string };

export function FormularioDeAssinatura({ documento, valorMensal }: PropsDaAssinatura) {
  const [estado, acao, enviando] = useActionState(assinar, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? { documento };

  return (
    <form action={acao} className="space-y-4">
      <CampoRotulado
        rotulo="CPF ou CNPJ de quem paga"
        htmlFor="documento"
        erro={erros.documento}
        dica="Sai na fatura. Pode ser o CNPJ da assistência ou o seu CPF."
        className="max-w-sm"
      >
        <input
          id="documento"
          name="documento"
          required
          autoComplete="off"
          defaultValue={valores.documento}
          aria-describedby={erros.documento ? "documento-erro" : undefined}
          className={campo}
        />
      </CampoRotulado>

      <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
        <button type="submit" disabled={enviando} className={botao("primario")}>
          {enviando ? "Assinando..." : `Assinar por ${emReais(valorMensal)} por mês`}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}

export function CancelamentoDaAssinatura() {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, acao, enviando] = useActionState(cancelarAssinatura, INICIAL);

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className={botao("fantasma", "sm")}>
        Cancelar assinatura
      </button>
    );
  }

  return (
    <form action={acao} className="w-full space-y-3 rounded-2xl border border-borda bg-realce p-4">
      <p className="text-[13px] text-texto">
        Cancelar a assinatura? Nada mais é cobrado. Você continua usando até o fim do período já
        pago, ou do teste grátis, e depois disso o Bancada fica só para consulta, com todos os dados
        guardados.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={enviando} className={botao("perigo", "sm")}>
          {enviando ? "Cancelando..." : "Sim, cancelar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className={botao("fantasma", "sm")}
        >
          Voltar
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
