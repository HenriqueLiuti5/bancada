"use client";

import { useTransition } from "react";
import { CheckIcon, CopyIcon, WhatsappLogoIcon, XIcon } from "@/componentes/icones";
import { Avatar } from "@/componentes/ui/Avatar";
import { Selo } from "@/componentes/ui/Selo";
import { botaoDeIcone } from "@/componentes/ui/estilos";
import { useCopiar } from "@/componentes/useCopiar";
import { mensagemDoConvite, validadeDoConvite } from "@/lib/convites";
import type { Convite } from "@/lib/tipos";
import { cancelarConvite } from "./acoes";

export function ConvitePendente({ convite, assistencia }: { convite: Convite; assistencia: string }) {
  const { copiado, copiar } = useCopiar();
  const [cancelando, iniciarCancelamento] = useTransition();
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagemDoConvite(convite, assistencia))}`;

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <Avatar nome={convite.nome} />

      <div className="min-w-0 flex-1 basis-44">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="truncate">{convite.nome}</span>
          <Selo
            status={convite.expirado ? "vencida" : "aberta"}
            rotulo={convite.expirado ? "convite expirado" : "convite pendente"}
          />
        </p>
        <p className="truncate text-sm text-texto-apagado sm:text-[13px]">
          {convite.papel_rotulo} · {validadeDoConvite(convite)}
          {convite.email && ` · ${convite.email}`}
        </p>
      </div>

      <div className="flex max-sm:w-full max-sm:pl-12">
        {!convite.expirado && (
          <>
            <button
              type="button"
              title="Copiar link do convite"
              onClick={() => copiar(convite.link)}
              className={botaoDeIcone}
            >
              {copiado ? <CheckIcon size={17} /> : <CopyIcon size={17} />}
              <span className="sr-only">Copiar link do convite</span>
            </button>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              title="Mandar pelo WhatsApp"
              className={botaoDeIcone}
            >
              <WhatsappLogoIcon size={17} />
              <span className="sr-only">Mandar pelo WhatsApp</span>
            </a>
          </>
        )}
        <button
          type="button"
          title="Cancelar convite"
          disabled={cancelando}
          onClick={() => iniciarCancelamento(() => cancelarConvite(convite.id))}
          className={botaoDeIcone}
        >
          <XIcon size={17} />
          <span className="sr-only">Cancelar convite</span>
        </button>
      </div>
    </li>
  );
}
