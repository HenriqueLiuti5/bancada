"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { marcarTourVisto } from "./acoes";
import { ConducaoDoTour, elementoVisivel, type Passo } from "./conducaoDoTour";
import { ROTEIROS, type NomeDoTour } from "./roteiros";

const ESPERA_ANTES_DE_COMECAR = 400;

type Contexto = {
  registrar: (nome: NomeDoTour) => () => void;
  abrirTourDaTela: (() => void) | null;
};

const ContextoDoTour = createContext<Contexto>({
  registrar: () => () => {},
  abrirTourDaTela: null,
});

function passosPara(nome: NomeDoTour, papel: string): Passo[] {
  return ROTEIROS[nome]
    .filter((parada) => !parada.papeis || parada.papeis.includes(papel))
    .filter((parada) => !parada.alvo || elementoVisivel(parada.alvo))
    .map(({ alvo, titulo, texto, lado }) => ({ alvo, titulo, texto, lado }));
}

type Aberto = { passos: Passo[]; chave: number };

type Props = { papel: string; vistos: string[]; children: React.ReactNode };

export function ProvedorDeTour({ papel, vistos, children }: Props) {
  const jaVistos = useRef(new Set(vistos));
  const emCurso = useRef<NomeDoTour | null>(null);
  const aberturas = useRef(0);
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [tourDaTela, setTourDaTela] = useState<NomeDoTour | null>(null);

  const encerrar = useCallback(() => {
    const nome = emCurso.current;
    if (!nome) return;
    emCurso.current = null;
    jaVistos.current.add(nome);
    void marcarTourVisto(nome);
    setAberto(null);
  }, []);

  const iniciar = useCallback(
    (nome: NomeDoTour) => {
      const passos = passosPara(nome, papel);
      if (passos.length === 0) return;
      emCurso.current = nome;
      aberturas.current += 1;
      setAberto({ passos, chave: aberturas.current });
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
        if (emCurso.current === nome) encerrar();
        setTourDaTela((atual) => (atual === nome ? null : atual));
      };
    },
    [iniciar, encerrar],
  );

  const valor = useMemo(
    () => ({
      registrar,
      abrirTourDaTela: tourDaTela ? () => iniciar(tourDaTela) : null,
    }),
    [registrar, iniciar, tourDaTela],
  );

  return (
    <ContextoDoTour value={valor}>
      {children}
      {aberto && <ConducaoDoTour key={aberto.chave} passos={aberto.passos} aoFechar={encerrar} />}
    </ContextoDoTour>
  );
}

export function useTour(): Contexto {
  return useContext(ContextoDoTour);
}

export function Tour({ nome }: { nome: NomeDoTour }) {
  const { registrar } = useTour();

  useEffect(() => registrar(nome), [registrar, nome]);

  return null;
}
