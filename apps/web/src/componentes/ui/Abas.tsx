"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { juntar } from "@/componentes/ui/estilos";

export type Aba = {
  id: string;
  rotulo: string;
  icone: React.ReactNode;
  contagem?: number;
  conteudo: React.ReactNode;
};

type Props = { abas: Aba[]; inicial: string; tour?: string; className?: string };

function lerAncora(): string {
  return window.location.hash.slice(1);
}

function acompanharAncora(avisar: () => void): () => void {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
}

export function Abas({ abas, inicial, tour, className }: Props) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const ancora = useSyncExternalStore(acompanharAncora, lerAncora, () => "");
  const caixa = useRef<HTMLElement>(null);
  const botoes = useRef<Record<string, HTMLButtonElement | null>>({});
  const ids = abas.map((aba) => aba.id);
  const ativa = escolhida ?? (ids.includes(ancora) ? ancora : inicial);
  const listaDeIds = ids.join(" ");

  useEffect(() => {
    const existentes = listaDeIds.split(" ");

    function aoClicar(evento: MouseEvent) {
      const link = evento.target instanceof Element ? evento.target.closest('a[href^="#"]') : null;
      const destino = link?.getAttribute("href")?.slice(1) ?? "";
      if (!existentes.includes(destino)) return;
      evento.preventDefault();
      setEscolhida(destino);
      window.history.replaceState(null, "", `#${destino}`);
      caixa.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, [listaDeIds]);

  function escolher(id: string) {
    setEscolhida(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  function aoTeclar(evento: React.KeyboardEvent, indice: number) {
    const destinos: Record<string, number> = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;

    evento.preventDefault();
    const id = abas[destino].id;
    escolher(id);
    botoes.current[id]?.focus();
  }

  return (
    <section
      ref={caixa}
      className={juntar(
        "scroll-mt-20 overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao lg:scroll-mt-6",
        className,
      )}
    >
      <div
        role="tablist"
        data-tour={tour}
        className="flex overflow-x-auto border-b border-borda sm:gap-1 sm:px-3"
      >
        {abas.map((aba, indice) => {
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              ref={(botao) => {
                botoes.current[aba.id] = botao;
              }}
              type="button"
              role="tab"
              id={`aba-${aba.id}`}
              aria-selected={selecionada}
              aria-controls={`painel-${aba.id}`}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => escolher(aba.id)}
              onKeyDown={(evento) => aoTeclar(evento, indice)}
              className={juntar(
                "relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3.5 text-[13px] whitespace-nowrap transition-colors duration-150 sm:flex-none sm:gap-2 sm:px-3",
                selecionada ? "font-semibold text-texto" : "font-medium text-texto-apagado hover:text-texto",
              )}
            >
              <span className={juntar("max-sm:hidden", selecionada ? "text-destaque" : "text-icone")}>
                {aba.icone}
              </span>
              {aba.rotulo}
              {aba.contagem !== undefined && aba.contagem > 0 && (
                <span className="rounded-full bg-realce px-1.5 text-xs font-semibold text-texto-suave tabular-nums">
                  {aba.contagem}
                </span>
              )}
              {selecionada && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primario sm:inset-x-2"
                />
              )}
            </button>
          );
        })}
      </div>

      {abas.map((aba) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={`painel-${aba.id}`}
          aria-labelledby={`aba-${aba.id}`}
          hidden={aba.id !== ativa}
        >
          {aba.conteudo}
        </div>
      ))}
    </section>
  );
}
