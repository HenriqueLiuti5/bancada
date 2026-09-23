"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { enderecoDaFoto } from "@/lib/fotos";
import type { Foto } from "@/lib/tipos";
import { alternarVisibilidade, apagarFoto, enviarFoto, type EstadoDaFoto } from "./acoes";

const INICIAL: EstadoDaFoto = {};

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

const BOTAO_DISCRETO =
  "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-300";

function Cartao({ id, foto, podeApagar }: { id: number; foto: Foto; podeApagar: boolean }) {
  return (
    <figure className="space-y-2">
      <Image
        src={enderecoDaFoto(foto.assinatura)}
        alt={foto.legenda || `Foto ${foto.momento_label.toLowerCase()}`}
        width={foto.largura}
        height={foto.altura}
        unoptimized
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
      />

      <figcaption className="space-y-1">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {foto.momento_label}
          {foto.legenda && ` · ${foto.legenda}`}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {foto.visivel_ao_cliente ? "Visível ao cliente" : "Escondida do cliente"}
        </p>

        <div className="flex gap-2 pt-1">
          <form action={alternarVisibilidade}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="foto" value={foto.id} />
            <input
              type="hidden"
              name="visivel"
              value={foto.visivel_ao_cliente ? "sim" : "nao"}
            />
            <button type="submit" className={BOTAO_DISCRETO}>
              {foto.visivel_ao_cliente ? "Esconder" : "Mostrar"}
            </button>
          </form>

          {podeApagar && (
            <form action={apagarFoto}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="foto" value={foto.id} />
              <button type="submit" className={BOTAO_DISCRETO}>
                Apagar
              </button>
            </form>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

export function FotosDaOrdem({
  id,
  fotos,
  podeApagar,
}: {
  id: number;
  fotos: Foto[];
  podeApagar: boolean;
}) {
  const [estado, acao, enviando] = useActionState(enviarFoto, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.enviada) formulario.current?.reset();
  }, [estado]);

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">Fotos do aparelho</h2>

      {fotos.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {fotos.map((foto) => (
            <Cartao key={foto.id} id={id} foto={foto} podeApagar={podeApagar} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhuma foto ainda. Fotografe o aparelho na entrada: é o registro do estado em que ele
          chegou.
        </p>
      )}

      <form ref={formulario} action={acao} className="max-w-lg space-y-3">
        <input type="hidden" name="id" value={id} />

        <input
          type="file"
          name="arquivo"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-white dark:file:text-neutral-900"
        />

        <div className="flex flex-wrap gap-3">
          <select name="momento" className={`${CAMPO} sm:w-40`} defaultValue="entrada">
            <option value="entrada">Na entrada</option>
            <option value="saida">Na entrega</option>
          </select>

          <input name="legenda" placeholder="Legenda (opcional)" className={`${CAMPO} sm:flex-1`} />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {enviando ? "Enviando..." : "Adicionar foto"}
        </button>

        {estado.erro && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {estado.erro}
          </p>
        )}
      </form>
    </section>
  );
}
