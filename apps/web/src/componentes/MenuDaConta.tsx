"use client";

import { useState } from "react";
import { sair } from "@/app/acoes";
import {
  CaretUpDownIcon,
  MonitorIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
  type Icon,
} from "@/componentes/icones";
import { Avatar } from "@/componentes/ui/Avatar";
import { focoNaLateral, juntar, rotuloDaLateral } from "@/componentes/ui/estilos";
import { posicaoDoMenu, useMenuSuspenso } from "@/componentes/useMenuSuspenso";
import { aplicarTema, preferenciaAtual, type PreferenciaDeTema } from "@/lib/tema";

const OPCOES_DE_TEMA: { valor: PreferenciaDeTema; rotulo: string; icone: Icon }[] = [
  { valor: "claro", rotulo: "Claro", icone: SunIcon },
  { valor: "escuro", rotulo: "Escuro", icone: MoonIcon },
  { valor: "automatico", rotulo: "Automático", icone: MonitorIcon },
];

type Props = {
  nome: string;
  detalhe: string;
  lugar: "barra-lateral" | "cabecalho";
  recolhida?: boolean;
};

function EscolhaDoTema() {
  const [preferencia, setPreferencia] = useState<PreferenciaDeTema>(preferenciaAtual);

  function escolher(valor: PreferenciaDeTema) {
    aplicarTema(valor);
    setPreferencia(valor);
  }

  return (
    <div className="px-2 pt-2 pb-2.5">
      <p className="mb-2 px-1 text-xs font-semibold text-texto-apagado">Aparência</p>
      <div role="group" aria-label="Aparência" className="grid grid-cols-3 gap-1 rounded-2xl bg-realce p-1">
        {OPCOES_DE_TEMA.map(({ valor, rotulo, icone: Icone }) => {
          const marcada = preferencia === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={marcada}
              onClick={() => escolher(valor)}
              className={juntar(
                "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors duration-150",
                marcada ? "bg-superficie text-texto shadow-suave" : "text-texto-apagado hover:text-texto",
              )}
            >
              <Icone size={16} />
              {rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MenuDaConta({ nome, detalhe, lugar, recolhida = false }: Props) {
  const { aberto, setAberto, caixa, painel } = useMenuSuspenso();
  const naBarraLateral = lugar === "barra-lateral";

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={painel}
        title={naBarraLateral ? undefined : "Sua conta"}
        data-dica={naBarraLateral ? nome : undefined}
        onClick={() => setAberto((atual) => !atual)}
        className={juntar(
          naBarraLateral
            ? "flex w-full items-center gap-3 overflow-hidden rounded-xl px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-lateral-hover"
            : "flex size-10 items-center justify-center rounded-full transition-colors duration-150 hover:bg-lateral-hover",
          focoNaLateral,
        )}
      >
        <Avatar nome={nome} naLateral />
        {naBarraLateral ? (
          <>
            <span className={rotuloDaLateral(recolhida, "flex-1")}>
              <span className="block truncate text-sm font-semibold text-lateral-texto">{nome}</span>
              <span className="block truncate text-xs text-lateral-texto-suave">{detalhe}</span>
            </span>
            <CaretUpDownIcon
              size={16}
              className={rotuloDaLateral(recolhida, "shrink-0 text-lateral-texto-suave")}
            />
          </>
        ) : (
          <span className="sr-only">Sua conta</span>
        )}
      </button>

      {aberto && (
        <div
          id={painel}
          className={juntar(
            "absolute z-30 w-64 rounded-2xl border border-borda bg-superficie p-1.5 text-texto shadow-elevada",
            posicaoDoMenu(naBarraLateral, recolhida),
          )}
        >
          <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
            <Avatar nome={nome} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{nome}</p>
              <p className="truncate text-xs text-texto-apagado">{detalhe}</p>
            </div>
          </div>

          <div className="border-t border-borda">
            <EscolhaDoTema />
          </div>

          <form action={sair} className="border-t border-borda pt-1.5">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-texto transition-colors duration-150 hover:bg-realce sm:py-2"
            >
              <SignOutIcon size={16} className="shrink-0 text-texto-apagado" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
