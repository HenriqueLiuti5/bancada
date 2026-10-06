"use client";

import { useActionState } from "react";
import { EnvelopeSimpleIcon } from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { botao } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { reenviarConfirmacao } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function AvisoDeEmail({ email }: { email: string }) {
  const [estado, acao, enviando] = useActionState(reenviarConfirmacao, INICIAL);

  return (
    <Alerta
      tom="info"
      icone={EnvelopeSimpleIcon}
      titulo="Confirme seu e-mail"
      className="mb-6"
      acao={
        !estado.ok && (
          <form action={acao}>
            <button type="submit" disabled={enviando} className={botao("secundario", "sm")}>
              {enviando ? "Reenviando..." : "Reenviar link"}
            </button>
          </form>
        )
      }
    >
      {estado.ok ?? estado.erro ?? (
        <>
          Mandamos um link para <strong className="font-semibold text-texto-suave">{email}</strong>. É
          por ele que você recupera a senha.
        </>
      )}
    </Alerta>
  );
}
