"use client";

import { useActionState } from "react";
import { EyeIcon, ShieldCheckIcon } from "@/componentes/icones";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, juntar } from "@/componentes/ui/estilos";
import { verSenhaDoAparelho, type EstadoDaSenha } from "./acoes";

const INICIAL: EstadoDaSenha = {};

export function SenhaDoAparelho({ aparelho }: { aparelho: number }) {
  const [estado, acao, consultando] = useActionState(verSenhaDoAparelho, INICIAL);

  if (estado.revelada) {
    return (
      <div className="space-y-2">
        <p className="rounded-xl bg-realce px-3.5 py-2.5 font-mono text-base tracking-wider">
          {estado.senha || "Nenhuma senha cadastrada"}
        </p>
        <p className="flex items-start gap-1.5 text-[13px] text-texto-suave sm:text-xs">
          <ShieldCheckIcon size={14} className="mt-px shrink-0 text-sucesso" />
          Esta consulta ficou registrada na auditoria, com seu usuário e o horário.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="aparelho" value={aparelho} />
      <button type="submit" disabled={consultando} className={juntar(botao("secundario", "sm"), "w-full")}>
        <EyeIcon size={16} />
        {consultando ? "Consultando..." : "Revelar senha"}
      </button>
      <p className="text-[13px] text-texto-apagado sm:text-xs">Cada consulta fica registrada na auditoria.</p>
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </form>
  );
}
