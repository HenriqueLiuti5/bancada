"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { Cartao } from "@/componentes/ui/Cartao";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { emReais } from "@/lib/moeda";
import type { CustoDoMes } from "@/lib/tipos";
import { lancarCusto, removerCusto } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

function LinhaDoCusto({ custo }: { custo: CustoDoMes }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-2">
      <span className="min-w-0 truncate text-sm">{custo.descricao}</span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="text-sm tabular-nums">{emReais(custo.valor)}</span>
        <form action={removerCusto}>
          <input type="hidden" name="id" value={custo.id} />
          <button
            type="submit"
            title="Remover custo lançado errado"
            className={juntar(botao("fantasma", "sm"), "px-2")}
          >
            <Trash2 size={14} strokeWidth={1.75} />
            <span className="sr-only">Remover {custo.descricao}</span>
          </button>
        </form>
      </span>
    </li>
  );
}

export function CustosDoMes({
  mes,
  nome,
  custos,
}: {
  mes: string;
  nome: string;
  custos: CustoDoMes[];
}) {
  const [estado, acao, enviando] = useActionState(lancarCusto, INICIAL);
  const valores = estado.valores ?? {};
  const erro = estado.erro ?? Object.values(estado.erros ?? {})[0];

  return (
    <Cartao
      titulo={`Custos de ${nome}`}
      descricao="Servidor, domínio, e-mail e o que mais for pago no mês."
      semEspaco
    >
      {custos.length > 0 ? (
        <ul className="divide-y divide-borda">
          {custos.map((custo) => (
            <LinhaDoCusto key={custo.id} custo={custo} />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[13px] text-texto-suave">Nenhum custo lançado em {nome}.</p>
      )}

      <form action={acao} className="space-y-3 border-t border-borda p-5">
        <input type="hidden" name="mes" value={mes} />
        <div className="flex flex-wrap gap-2">
          <input
            name="descricao"
            aria-label="Descrição do custo"
            placeholder="Ex.: domínio do site"
            maxLength={80}
            required
            defaultValue={valores.descricao}
            className={juntar(campo, "min-w-0 flex-1 basis-44")}
          />
          <input
            name="valor"
            aria-label="Valor do custo"
            placeholder="0,00"
            inputMode="decimal"
            autoComplete="off"
            required
            defaultValue={valores.valor}
            className={juntar(campo, "w-28 tabular-nums")}
          />
          <button type="submit" disabled={enviando} className={botao("secundario")}>
            {enviando ? "Lançando..." : "Lançar custo"}
          </button>
        </div>
        {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      </form>
    </Cartao>
  );
}
