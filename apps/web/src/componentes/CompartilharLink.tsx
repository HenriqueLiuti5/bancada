"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState } from "react";
import { botao, juntar } from "@/componentes/ui/estilos";

export function CompartilharLink({
  url,
  aparelho,
  cliente,
}: {
  url: string;
  aparelho: string;
  cliente: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Olá, ${cliente}! Acompanhe o reparo do seu ${aparelho} por aqui: ${url}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="truncate rounded-lg border border-borda bg-realce px-3 py-2 font-mono text-xs text-texto-suave">
        {url}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copiar} className={botao("secundario", "sm")}>
          {copiado ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a href={whatsapp} target="_blank" rel="noreferrer" className={botao("secundario", "sm")}>
          <MessageCircle size={14} strokeWidth={2} />
          WhatsApp
        </a>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={juntar(botao("fantasma", "sm"), "col-span-2")}
        >
          <ExternalLink size={14} strokeWidth={2} />
          Ver como o cliente vê
        </a>
      </div>
    </div>
  );
}
