"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { PontoDeStatus } from "@/componentes/ui/Selo";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import type { Transicao } from "@/lib/tipos";
import { transicionar, type EstadoTransicao } from "./acoes";

const INICIAL: EstadoTransicao = {};

export function AcoesDeStatus({ id, transicoes }: { id: number; transicoes: Transicao[] }) {
  const [estado, acao, enviando] = useActionState(transicionar, INICIAL);

  if (transicoes.length === 0) {
    return (
      <p className="text-[13px] text-texto-suave">
        Esta ordem está encerrada. Nenhuma mudança de status é possível.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <input
        name="nota"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        className={campo}
      />

      <div className="space-y-2">
        {transicoes.map((transicao) => (
          <button
            key={transicao.valor}
            type="submit"
            name="status"
            value={transicao.valor}
            disabled={enviando}
            className={juntar(botao("secundario"), "group w-full justify-between")}
          >
            <span className="flex items-center gap-2">
              <PontoDeStatus status={transicao.valor} />
              {transicao.rotulo}
            </span>
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="text-texto-apagado transition-transform group-hover:translate-x-0.5"
            />
          </button>
        ))}
      </div>

      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
