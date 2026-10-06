"use client";

import { useEffect, useId, useRef, useState } from "react";

export function posicaoDoMenu(naBarraLateral: boolean, recolhida: boolean): string {
  if (!naBarraLateral) return "top-full right-0 mt-2";
  return recolhida ? "bottom-0 left-full ml-5" : "bottom-full left-0 mb-2";
}

export function useMenuSuspenso() {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const painel = useId();

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

  return { aberto, setAberto, caixa, painel };
}
