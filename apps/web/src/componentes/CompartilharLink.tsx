"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { botao, juntar } from "@/componentes/ui/estilos";
import { useCopiar } from "@/componentes/useCopiar";

export type MeioDeCompartilhamento = "whatsapp" | "copia";

type Props = {
  url: string;
  mensagem: string;
  rotuloDaPrevia?: string;
  aoCompartilhar?: (meio: MeioDeCompartilhamento) => Promise<void>;
};

export function CompartilharLink({ url, mensagem, rotuloDaPrevia, aoCompartilhar }: Props) {
  const { copiado, copiar } = useCopiar();
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  function avisar(meio: MeioDeCompartilhamento) {
    void aoCompartilhar?.(meio).catch(() => undefined);
  }

  function copiarLink() {
    void copiar(url);
    avisar("copia");
  }

  return (
    <div className="space-y-3">
      <p className="truncate rounded-lg border border-borda bg-realce px-3 py-2 font-mono text-xs text-texto-suave">
        {url}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copiarLink} className={botao("secundario", "sm")}>
          {copiado ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => avisar("whatsapp")}
          className={botao("secundario", "sm")}
        >
          <MessageCircle size={14} strokeWidth={2} />
          WhatsApp
        </a>
        {rotuloDaPrevia && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={juntar(botao("fantasma", "sm"), "col-span-2")}
          >
            <ExternalLink size={14} strokeWidth={2} />
            {rotuloDaPrevia}
          </a>
        )}
      </div>
    </div>
  );
}
