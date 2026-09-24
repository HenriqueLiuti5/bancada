"use client";

import { useState } from "react";

const TEMPO_DO_AVISO_DE_COPIADO = 2000;

export function useCopiar(): { copiado: boolean; copiar: (texto: string) => Promise<void> } {
  const [copiado, setCopiado] = useState(false);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), TEMPO_DO_AVISO_DE_COPIADO);
    } catch {
      setCopiado(false);
    }
  }

  return { copiado, copiar };
}
