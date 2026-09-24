"use client";

import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useActionState, useState } from "react";
import { Avatar } from "@/componentes/ui/Avatar";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { MembroDaEquipe } from "@/lib/tipos";
import { alterarUsuario, redefinirSenha, type EstadoDaEquipe } from "./acoes";

const INICIAL: EstadoDaEquipe = {};

export function Membro({ membro, souEu }: { membro: MembroDaEquipe; souEu: boolean }) {
  const [alteracao, alterar, alterando] = useActionState(alterarUsuario, INICIAL);
  const [senha, trocarSenha, trocando] = useActionState(redefinirSenha, INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const nome = membro.first_name || membro.username;

  return (
    <li className="space-y-3 px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar nome={nome} />

        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-2 text-sm font-medium ${membro.is_active ? "" : "text-texto-apagado"}`}>
            <span className="truncate">{nome}</span>
            {souEu && (
              <span className="rounded-md border border-borda px-1.5 text-[11px] font-medium text-texto-suave">
                você
              </span>
            )}
            {!membro.is_active && (
              <span className="rounded-md border border-borda px-1.5 text-[11px] font-medium text-texto-suave">
                desativado
              </span>
            )}
          </p>
          <p className="truncate text-[13px] text-texto-suave">{membro.email || membro.username}</p>
        </div>

        {souEu ? (
          <span className="text-[13px] text-texto-suave">{membro.papel_rotulo}</span>
        ) : (
          <form action={alterar}>
            <input type="hidden" name="id" value={membro.id} />
            <select
              name="papel"
              aria-label={`Papel de ${nome}`}
              defaultValue={membro.papel}
              disabled={alterando}
              onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
              className={juntar(seletor, "h-8 w-auto text-[13px]")}
            >
              <option value="dono">Dono</option>
              <option value="tecnico">Técnico</option>
              <option value="atendente">Atendente</option>
            </select>
          </form>
        )}

        <div className="flex">
          <button
            type="button"
            title="Redefinir senha"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            className={juntar(botao("fantasma", "sm"), "px-2")}
          >
            <KeyRound size={14} strokeWidth={1.75} />
            <span className="sr-only">Redefinir senha</span>
          </button>

          {!souEu && (
            <form action={alterar}>
              <input type="hidden" name="id" value={membro.id} />
              <input type="hidden" name="ativo" value={membro.is_active ? "nao" : "sim"} />
              <button
                type="submit"
                disabled={alterando}
                title={membro.is_active ? "Desativar" : "Reativar"}
                className={juntar(botao("fantasma", "sm"), "px-2")}
              >
                {membro.is_active ? (
                  <UserX size={14} strokeWidth={1.75} />
                ) : (
                  <UserCheck size={14} strokeWidth={1.75} />
                )}
                <span className="sr-only">{membro.is_active ? "Desativar" : "Reativar"}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {mostrarSenha && (
        <form action={trocarSenha} className="flex flex-wrap items-center gap-2 pl-10">
          <input type="hidden" name="id" value={membro.id} />
          <input
            name="senha"
            type="password"
            aria-label={`Nova senha de ${nome}`}
            placeholder="Nova senha"
            autoComplete="new-password"
            className={juntar(campo, "h-8 max-w-60 text-[13px]")}
          />
          <button type="submit" disabled={trocando} className={botao("secundario", "sm")}>
            {trocando ? "Salvando..." : "Salvar senha"}
          </button>
        </form>
      )}

      {(alteracao.erro || senha.erro) && (
        <div className="pl-10">
          <Mensagem tipo="erro">{alteracao.erro || senha.erro}</Mensagem>
        </div>
      )}
      {senha.ok && (
        <div className="pl-10">
          <Mensagem tipo="sucesso">{senha.ok}</Mensagem>
        </div>
      )}
    </li>
  );
}
