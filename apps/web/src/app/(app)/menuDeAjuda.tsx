"use client";

import { CircleHelp, Compass, ListChecks, MessageCircle, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { botao, juntar } from "@/componentes/ui/estilos";
import { mostrarPrimeirosPassos } from "./acoes";
import { useTour } from "./tour";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-texto transition-colors hover:bg-realce";

function Rotulo({ icone: Icone, children }: { icone: LucideIcon; children: React.ReactNode }) {
  return (
    <>
      <Icone size={15} strokeWidth={1.75} className="shrink-0 text-texto-suave" />
      {children}
    </>
  );
}

type Props = {
  linkDoSuporte: string | null;
  podeReabrirPrimeirosPassos: boolean;
  lugar: "barra-lateral" | "cabecalho";
};

export function MenuDeAjuda({ linkDoSuporte, podeReabrirPrimeirosPassos, lugar }: Props) {
  const { abrirTourDaTela } = useTour();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function fecharSeClicarFora(evento: PointerEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    }
    function fecharNoEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("pointerdown", fecharSeClicarFora);
    document.addEventListener("keydown", fecharNoEsc);
    return () => {
      document.removeEventListener("pointerdown", fecharSeClicarFora);
      document.removeEventListener("keydown", fecharNoEsc);
    };
  }, [aberto]);

  if (!abrirTourDaTela && !podeReabrirPrimeirosPassos && !linkDoSuporte) return null;

  function verTour() {
    setAberto(false);
    abrirTourDaTela?.();
  }

  const naBarraLateral = lugar === "barra-lateral";

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        data-tour="ajuda"
        aria-expanded={aberto}
        aria-haspopup="menu"
        title="Ajuda"
        onClick={() => setAberto((atual) => !atual)}
        className={
          naBarraLateral
            ? "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-texto-suave transition-colors hover:bg-realce hover:text-texto"
            : botao("fantasma", "sm")
        }
      >
        <CircleHelp size={16} strokeWidth={1.75} />
        {naBarraLateral ? "Ajuda" : <span className="sr-only">Ajuda</span>}
      </button>

      {aberto && (
        <div
          role="menu"
          className={juntar(
            "absolute z-20 w-64 space-y-0.5 rounded-xl border border-borda bg-superficie p-1.5 shadow-lg",
            naBarraLateral ? "bottom-full left-0 mb-1.5" : "top-full right-0 mt-2",
          )}
        >
          {abrirTourDaTela && (
            <button type="button" role="menuitem" onClick={verTour} className={ITEM}>
              <Rotulo icone={Compass}>Ver o tour desta tela</Rotulo>
            </button>
          )}

          {podeReabrirPrimeirosPassos && (
            <form action={mostrarPrimeirosPassos} onSubmit={() => setAberto(false)}>
              <button type="submit" role="menuitem" className={ITEM}>
                <Rotulo icone={ListChecks}>Mostrar os primeiros passos</Rotulo>
              </button>
            </form>
          )}

          {linkDoSuporte && (
            <a
              href={linkDoSuporte}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setAberto(false)}
              className={ITEM}
            >
              <Rotulo icone={MessageCircle}>Fale com a gente no WhatsApp</Rotulo>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
