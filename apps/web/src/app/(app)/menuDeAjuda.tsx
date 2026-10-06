"use client";

import {
  CompassIcon,
  ListChecksIcon,
  QuestionIcon,
  WhatsappLogoIcon,
  type Icon,
} from "@/componentes/icones";
import { focoNaLateral, itemDaLateral, juntar, rotuloDaLateral } from "@/componentes/ui/estilos";
import { posicaoDoMenu, useMenuSuspenso } from "@/componentes/useMenuSuspenso";
import { mostrarPrimeirosPassos } from "./acoes";
import { useTour } from "./tour";

const ITEM =
  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-texto transition-colors duration-150 hover:bg-realce sm:py-2";

function Rotulo({ icone: Icone, children }: { icone: Icon; children: React.ReactNode }) {
  return (
    <>
      <Icone size={18} className="shrink-0 text-icone" />
      {children}
    </>
  );
}

type Props = {
  linkDoSuporte: string | null;
  podeReabrirPrimeirosPassos: boolean;
  lugar: "barra-lateral" | "cabecalho";
  recolhida?: boolean;
};

export function MenuDeAjuda({
  linkDoSuporte,
  podeReabrirPrimeirosPassos,
  lugar,
  recolhida = false,
}: Props) {
  const { abrirTourDaTela } = useTour();
  const { aberto, setAberto, caixa, painel } = useMenuSuspenso();

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
        data-dica={naBarraLateral ? "Ajuda" : undefined}
        aria-expanded={aberto}
        aria-controls={painel}
        title={naBarraLateral ? undefined : "Ajuda"}
        onClick={() => setAberto((atual) => !atual)}
        className={juntar(
          naBarraLateral
            ? `${itemDaLateral} text-lateral-texto-suave hover:bg-lateral-hover hover:text-lateral-texto`
            : "flex size-10 items-center justify-center rounded-full text-lateral-texto-suave transition-colors duration-150 hover:bg-lateral-hover hover:text-lateral-texto",
          focoNaLateral,
        )}
      >
        <QuestionIcon size={naBarraLateral ? 20 : 21} className="shrink-0" />
        {naBarraLateral ? (
          <span className={rotuloDaLateral(recolhida)}>Ajuda</span>
        ) : (
          <span className="sr-only">Ajuda</span>
        )}
      </button>

      {aberto && (
        <div
          id={painel}
          className={juntar(
            "absolute z-30 w-72 space-y-0.5 rounded-2xl border border-borda bg-superficie p-1.5 text-texto shadow-elevada",
            posicaoDoMenu(naBarraLateral, recolhida),
          )}
        >
          {abrirTourDaTela && (
            <button type="button" onClick={verTour} className={ITEM}>
              <Rotulo icone={CompassIcon}>Ver o tour desta tela</Rotulo>
            </button>
          )}

          {podeReabrirPrimeirosPassos && (
            <form action={mostrarPrimeirosPassos} onSubmit={() => setAberto(false)}>
              <button type="submit" className={ITEM}>
                <Rotulo icone={ListChecksIcon}>Mostrar os primeiros passos</Rotulo>
              </button>
            </form>
          )}

          {linkDoSuporte && (
            <a
              href={linkDoSuporte}
              target="_blank"
              rel="noreferrer"
              onClick={() => setAberto(false)}
              className={ITEM}
            >
              <Rotulo icone={WhatsappLogoIcon}>Fale com a gente no WhatsApp</Rotulo>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
