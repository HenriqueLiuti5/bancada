"use client";

import { MailWarning } from "lucide-react";
import { useActionState } from "react";
import { botao } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { reenviarConfirmacao } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function AvisoDeEmail({ email }: { email: string }) {
  const [estado, acao, enviando] = useActionState(reenviarConfirmacao, INICIAL);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-borda bg-superficie px-4 py-3 shadow-sutil">
      <MailWarning size={16} strokeWidth={1.75} className="shrink-0 text-status-espera" />
      <p className="min-w-0 flex-1 text-[13px] text-texto-suave">
        {estado.ok ?? estado.erro ?? (
          <>
            Confirme seu e-mail pelo link que mandamos para{" "}
            <strong className="font-medium text-texto">{email}</strong>. É por ele que você
            recupera a senha.
          </>
        )}
      </p>
      {!estado.ok && (
        <form action={acao}>
          <button type="submit" disabled={enviando} className={botao("secundario", "sm")}>
            {enviando ? "Reenviando..." : "Reenviar link"}
          </button>
        </form>
      )}
    </div>
  );
}
