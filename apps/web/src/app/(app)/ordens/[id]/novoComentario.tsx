"use client";

import { useActionState } from "react";
import { ChatCircleTextIcon } from "@/componentes/icones";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { areaDeTexto, botao } from "@/componentes/ui/estilos";
import { comentar, type EstadoDoComentario } from "./acoes";

const INICIAL: EstadoDoComentario = {};

export function NovoComentario({ id }: { id: number }) {
  const [estado, acao, enviando] = useActionState(comentar, INICIAL);

  return (
    <form action={acao} className="space-y-3 border-b border-borda px-5 py-4">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="comentario" className="sr-only">
        Comentário
      </label>
      <textarea
        id="comentario"
        name="texto"
        rows={2}
        required
        maxLength={2000}
        placeholder="Escreva um comentário para a equipe. O cliente não vê."
        defaultValue={estado.texto}
        className={areaDeTexto}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className={botao("secundario", "sm")}>
          <ChatCircleTextIcon size={15} />
          {enviando ? "Enviando..." : "Comentar"}
        </button>
        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </div>
    </form>
  );
}
