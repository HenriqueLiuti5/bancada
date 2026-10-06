"use client";

import { ArrowSquareOutIcon, CheckIcon, CopyIcon, WhatsappLogoIcon } from "@/componentes/icones";
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
      <p className="truncate rounded-xl bg-realce px-3.5 py-2.5 font-mono text-xs text-texto-suave">
        {url}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => avisar("whatsapp")}
          className={botao("primario", "sm")}
        >
          <WhatsappLogoIcon size={15} />
          WhatsApp
        </a>
        <button type="button" onClick={copiarLink} className={botao("secundario", "sm")}>
          {copiado ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
        {rotuloDaPrevia && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={juntar(botao("fantasma", "sm"), "col-span-2")}
          >
            <ArrowSquareOutIcon size={15} />
            {rotuloDaPrevia}
          </a>
        )}
      </div>
    </div>
  );
}
