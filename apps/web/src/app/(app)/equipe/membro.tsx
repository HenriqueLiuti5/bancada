"use client";

import { useActionState, useState } from "react";
import { KeyIcon, UserCheckIcon, UserMinusIcon } from "@/componentes/icones";
import { Avatar } from "@/componentes/ui/Avatar";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { Selo } from "@/componentes/ui/Selo";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import type { MembroDaEquipe } from "@/lib/tipos";
import { alterarUsuario, redefinirSenha, type EstadoDaEquipe } from "./acoes";

const INICIAL: EstadoDaEquipe = {};

export function Membro({ membro, souEu }: { membro: MembroDaEquipe; souEu: boolean }) {
  const [alteracao, alterar, alterando] = useActionState(alterarUsuario, INICIAL);
  const [senha, trocarSenha, trocando] = useActionState(redefinirSenha, INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const nome = membro.first_name || membro.username;

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar nome={nome} />

        <div className="min-w-0 flex-1 basis-44">
          <p className={`flex items-center gap-2 text-sm font-semibold ${membro.is_active ? "" : "text-texto-apagado"}`}>
            <span className="truncate">{nome}</span>
            {souEu && (
              <span className="rounded-md bg-realce px-1.5 text-[11px] leading-5 font-semibold text-texto-suave">
                você
              </span>
            )}
            {!membro.is_active && <Selo status="cancelada" rotulo="desativado" />}
          </p>
          <p className="truncate text-sm text-texto-apagado sm:text-[13px]">{membro.email || membro.username}</p>
        </div>

        <div className="flex items-center gap-2 max-sm:w-full max-sm:pl-12">
          {souEu ? (
            <span className="text-sm font-medium text-texto-apagado sm:text-[13px]">{membro.papel_rotulo}</span>
          ) : (
            <form action={alterar}>
              <input type="hidden" name="id" value={membro.id} />
              <select
                name="papel"
                aria-label={`Papel de ${nome}`}
                defaultValue={membro.papel}
                disabled={alterando}
                onChange={(evento) => evento.currentTarget.form?.requestSubmit()}
                className={juntar(seletor, "w-auto sm:h-9 sm:text-[13px]")}
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
              className={botaoDeIcone}
            >
              <KeyIcon size={17} />
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
                  className={botaoDeIcone}
                >
                  {membro.is_active ? (
                    <UserMinusIcon size={17} />
                  ) : (
                    <UserCheckIcon size={17} />
                  )}
                  <span className="sr-only">{membro.is_active ? "Desativar" : "Reativar"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {mostrarSenha && (
        <form action={trocarSenha} className="flex flex-wrap items-center gap-2 pl-12">
          <input type="hidden" name="id" value={membro.id} />
          <input
            name="senha"
            type="password"
            aria-label={`Nova senha de ${nome}`}
            placeholder="Nova senha"
            autoComplete="new-password"
            className={juntar(campo, "max-w-60 sm:h-9 sm:text-[13px]")}
          />
          <button type="submit" disabled={trocando} className={botao("secundario", "sm")}>
            {trocando ? "Salvando..." : "Salvar senha"}
          </button>
        </form>
      )}

      {(alteracao.erro || senha.erro) && (
        <div className="pl-12">
          <Mensagem tipo="erro">{alteracao.erro || senha.erro}</Mensagem>
        </div>
      )}
      {senha.ok && (
        <div className="pl-12">
          <Mensagem tipo="sucesso">{senha.ok}</Mensagem>
        </div>
      )}
    </li>
  );
}
