"use client";

import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { marcarTourVisto } from "./acoes";
import { ROTEIROS, type NomeDoTour } from "./roteiros";

const ESPERA_ANTES_DE_COMECAR = 400;
const OPACIDADE_DO_FUNDO = { claro: 0.55, escuro: 0.8 };

type Contexto = {
  registrar: (nome: NomeDoTour) => () => void;
  abrirTourDaTela: (() => void) | null;
};

const ContextoDoTour = createContext<Contexto>({
  registrar: () => () => {},
  abrirTourDaTela: null,
});

function elementoVisivel(alvo: string): Element | undefined {
  return Array.from(document.querySelectorAll(`[data-tour="${alvo}"]`)).find(
    (elemento) => elemento.getClientRects().length > 0,
  );
}

function paradasPara(nome: NomeDoTour, papel: string): DriveStep[] {
  return ROTEIROS[nome]
    .filter((parada) => !parada.papeis || parada.papeis.includes(papel))
    .flatMap((parada) => {
      const popover = { title: parada.titulo, description: parada.texto };
      if (!parada.alvo) return [{ popover }];

      const elemento = elementoVisivel(parada.alvo);
      return elemento ? [{ element: elemento, popover }] : [];
    });
}

function preferePoucoMovimento(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usaModoEscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function conduzir(paradas: DriveStep[], aoTerminar: () => void): Driver {
  const semMovimento = preferePoucoMovimento();
  const conducao = driver({
    steps: paradas,
    animate: !semMovimento,
    smoothScroll: !semMovimento,
    showProgress: paradas.length > 1,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo",
    prevBtnText: "Voltar",
    doneBtnText: "Entendi",
    popoverClass: "popover-do-bancada",
    overlayOpacity: usaModoEscuro() ? OPACIDADE_DO_FUNDO.escuro : OPACIDADE_DO_FUNDO.claro,
    stagePadding: 6,
    stageRadius: 12,
    disableActiveInteraction: true,
    overlayClickBehavior: () => {},
    onPopoverRender: (popover) => {
      popover.closeButton.title = "Pular o tour";
      popover.closeButton.setAttribute("aria-label", "Pular o tour");
    },
    onDestroyed: aoTerminar,
  });
  conducao.drive();
  return conducao;
}

type Props = { papel: string; vistos: string[]; children: React.ReactNode };

export function ProvedorDeTour({ papel, vistos, children }: Props) {
  const jaVistos = useRef(new Set(vistos));
  const conducao = useRef<Driver | null>(null);
  const [tourDaTela, setTourDaTela] = useState<NomeDoTour | null>(null);

  const iniciar = useCallback(
    (nome: NomeDoTour) => {
      conducao.current?.destroy();
      const paradas = paradasPara(nome, papel);
      if (paradas.length === 0) return;

      conducao.current = conduzir(paradas, () => {
        conducao.current = null;
        jaVistos.current.add(nome);
        void marcarTourVisto(nome);
      });
    },
    [papel],
  );

  const registrar = useCallback(
    (nome: NomeDoTour) => {
      setTourDaTela(nome);
      const espera = jaVistos.current.has(nome)
        ? undefined
        : window.setTimeout(() => iniciar(nome), ESPERA_ANTES_DE_COMECAR);

      return () => {
        window.clearTimeout(espera);
        conducao.current?.destroy();
        setTourDaTela((atual) => (atual === nome ? null : atual));
      };
    },
    [iniciar],
  );

  const valor = useMemo(
    () => ({
      registrar,
      abrirTourDaTela: tourDaTela ? () => iniciar(tourDaTela) : null,
    }),
    [registrar, iniciar, tourDaTela],
  );

  return <ContextoDoTour value={valor}>{children}</ContextoDoTour>;
}

export function useTour(): Contexto {
  return useContext(ContextoDoTour);
}

export function Tour({ nome }: { nome: NomeDoTour }) {
  const { registrar } = useTour();

  useEffect(() => registrar(nome), [registrar, nome]);

  return null;
}
