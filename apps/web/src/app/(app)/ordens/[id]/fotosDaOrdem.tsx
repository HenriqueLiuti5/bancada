"use client";

import { Camera, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { enderecoDaFoto } from "@/lib/fotos";
import type { Foto } from "@/lib/tipos";
import { alternarVisibilidade, apagarFoto, enviarFoto, type EstadoDaFoto } from "./acoes";

const INICIAL: EstadoDaFoto = {};

function FotoDaGaleria({ id, foto, podeApagar }: { id: number; foto: Foto; podeApagar: boolean }) {
  const titulo = foto.legenda || foto.momento_label;

  return (
    <figure className="space-y-2">
      <div className="relative">
        <Image
          src={enderecoDaFoto(foto.assinatura)}
          alt={foto.legenda || `Foto ${foto.momento_label.toLowerCase()}`}
          width={foto.largura}
          height={foto.altura}
          unoptimized
          className={`aspect-[4/3] w-full rounded-lg border border-borda object-cover ${foto.visivel_ao_cliente ? "" : "opacity-60"}`}
        />
        {!foto.visivel_ao_cliente && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md border border-borda bg-superficie px-1.5 py-0.5 text-[11px] font-medium text-texto-suave">
            <EyeOff size={11} strokeWidth={2} />
            Escondida
          </span>
        )}
      </div>

      <figcaption className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{titulo}</p>
          <p className="text-xs text-texto-suave">{foto.momento_label}</p>
        </div>

        <div className="flex shrink-0">
          <form action={alternarVisibilidade}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="foto" value={foto.id} />
            <input type="hidden" name="visivel" value={foto.visivel_ao_cliente ? "sim" : "nao"} />
            <button
              type="submit"
              title={foto.visivel_ao_cliente ? "Esconder do cliente" : "Mostrar ao cliente"}
              className={juntar(botao("fantasma", "sm"), "px-2")}
            >
              {foto.visivel_ao_cliente ? (
                <EyeOff size={14} strokeWidth={1.75} />
              ) : (
                <Eye size={14} strokeWidth={1.75} />
              )}
              <span className="sr-only">
                {foto.visivel_ao_cliente ? "Esconder do cliente" : "Mostrar ao cliente"}
              </span>
            </button>
          </form>

          {podeApagar && (
            <form action={apagarFoto}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="foto" value={foto.id} />
              <button type="submit" title="Apagar foto" className={juntar(botao("fantasma", "sm"), "px-2")}>
                <Trash2 size={14} strokeWidth={1.75} />
                <span className="sr-only">Apagar foto</span>
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
    <Cartao
      titulo="Fotos do aparelho"
      descricao="Aparecem no link do cliente, a menos que você as esconda."
    >
      {fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {fotos.map((foto) => (
            <FotoDaGaleria key={foto.id} id={id} foto={foto} podeApagar={podeApagar} />
          ))}
        </div>
      ) : (
        <EstadoVazio
          icone={<Camera size={18} strokeWidth={1.75} />}
          titulo="Nenhuma foto ainda"
          descricao="Fotografe o aparelho na entrada: é o registro do estado em que ele chegou."
        />
      )}

      <form
        ref={formulario}
        action={acao}
        className="mt-5 space-y-3 border-t border-borda pt-5"
      >
        <input type="hidden" name="id" value={id} />

        <input
          type="file"
          name="arquivo"
          aria-label="Foto do aparelho"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-[13px] text-texto-suave file:mr-3 file:h-8 file:cursor-pointer file:rounded-lg file:border file:border-borda file:bg-superficie file:px-3 file:text-[13px] file:font-medium file:text-texto hover:file:bg-realce"
        />

        <div className="flex flex-wrap gap-2">
          <select
            name="momento"
            aria-label="Momento da foto"
            defaultValue="entrada"
            className={juntar(seletor, "w-auto")}
          >
            <option value="entrada">Na entrada</option>
            <option value="saida">Na entrega</option>
          </select>
          <input
            name="legenda"
            aria-label="Legenda"
            placeholder="Legenda (opcional)"
            className={juntar(campo, "min-w-0 flex-1 basis-48")}
          />
          <button type="submit" disabled={enviando} className={botao("secundario")}>
            <Upload size={14} strokeWidth={2} />
            {enviando ? "Enviando..." : "Adicionar foto"}
          </button>
        </div>

        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </form>
    </Cartao>
  );
}
