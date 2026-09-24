"use client";

import { Check, Copy, MessageCircle, X } from "lucide-react";
import { useTransition } from "react";
import { Avatar } from "@/componentes/ui/Avatar";
import { botao, juntar } from "@/componentes/ui/estilos";
import { useCopiar } from "@/componentes/useCopiar";
import { mensagemDoConvite, validadeDoConvite } from "@/lib/convites";
import type { Convite } from "@/lib/tipos";
import { cancelarConvite } from "./acoes";

export function ConvitePendente({ convite, assistencia }: { convite: Convite; assistencia: string }) {
  const { copiado, copiar } = useCopiar();
  const [cancelando, iniciarCancelamento] = useTransition();
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagemDoConvite(convite, assistencia))}`;

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <Avatar nome={convite.nome} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{convite.nome}</span>
          <span className="rounded-md border border-borda px-1.5 text-[11px] font-medium text-texto-suave">
            {convite.expirado ? "convite expirado" : "convite pendente"}
          </span>
        </p>
        <p className="truncate text-[13px] text-texto-suave">
          {convite.papel_rotulo} · {validadeDoConvite(convite)}
          {convite.email && ` · ${convite.email}`}
        </p>
      </div>

      <div className="flex">
        {!convite.expirado && (
          <>
            <button
              type="button"
              title="Copiar link do convite"
              onClick={() => copiar(convite.link)}
              className={juntar(botao("fantasma", "sm"), "px-2")}
            >
              {copiado ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
              <span className="sr-only">Copiar link do convite</span>
            </button>
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              title="Mandar pelo WhatsApp"
              className={juntar(botao("fantasma", "sm"), "px-2")}
            >
              <MessageCircle size={14} strokeWidth={1.75} />
              <span className="sr-only">Mandar pelo WhatsApp</span>
            </a>
          </>
        )}
        <button
          type="button"
          title="Cancelar convite"
          disabled={cancelando}
          onClick={() => iniciarCancelamento(() => cancelarConvite(convite.id))}
          className={juntar(botao("fantasma", "sm"), "px-2")}
        >
          <X size={14} strokeWidth={1.75} />
          <span className="sr-only">Cancelar convite</span>
        </button>
      </div>
    </li>
  );
}
