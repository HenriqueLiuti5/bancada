"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { EscolhaDeImagem } from "@/componentes/ui/EscolhaDeImagem";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { enderecoDaFoto, fotoPassaDoTamanho, TAMANHO_MAXIMO_DA_FOTO_EM_MB } from "@/lib/fotos";
import type { Foto } from "@/lib/tipos";
import { alternarVisibilidade, apagarFoto, enviarFoto, type EstadoDaFoto } from "./acoes";

const INICIAL: EstadoDaFoto = {};

async function enviarSeCouber(anterior: EstadoDaFoto, dados: FormData): Promise<EstadoDaFoto> {
  const arquivo = dados.get("arquivo");
  if (arquivo instanceof File && fotoPassaDoTamanho(arquivo)) {
    return { erro: `A imagem passa de ${TAMANHO_MAXIMO_DA_FOTO_EM_MB} MB.` };
  }
  return enviarFoto(anterior, dados);
}

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
          className={`aspect-[4/3] w-full rounded-xl border border-borda object-cover ${foto.visivel_ao_cliente ? "" : "opacity-60"}`}
        />
        {!foto.visivel_ao_cliente && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-lateral px-2 py-0.5 text-[11px] font-semibold text-lateral-texto">
            <EyeSlashIcon size={11} />
            Escondida
          </span>
        )}
      </div>

      <figcaption className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{titulo}</p>
          <p className="text-xs text-texto-apagado">{foto.momento_label}</p>
        </div>

        <div className="flex shrink-0">
          <form action={alternarVisibilidade}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="foto" value={foto.id} />
            <input type="hidden" name="visivel" value={foto.visivel_ao_cliente ? "sim" : "nao"} />
            <button
              type="submit"
              title={foto.visivel_ao_cliente ? "Esconder do cliente" : "Mostrar ao cliente"}
              className={botaoDeIcone}
            >
              {foto.visivel_ao_cliente ? (
                <EyeSlashIcon size={16} />
              ) : (
                <EyeIcon size={16} />
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
              <button type="submit" title="Apagar foto" className={botaoDeIcone}>
                <TrashIcon size={16} />
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
  const [estado, acao, enviando] = useActionState(enviarSeCouber, INICIAL);
  const [arquivo, setArquivo] = useState("");
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.enviada) formulario.current?.reset();
  }, [estado]);

  return (
    <Cartao
      tour="fotos"
      titulo="Fotos do aparelho"
      icone={CameraIcon}
      descricao="Aparecem no link do cliente, a menos que você as esconda."
      semEspaco
    >
      {fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
          {fotos.map((foto) => (
            <FotoDaGaleria key={foto.id} id={id} foto={foto} podeApagar={podeApagar} />
          ))}
        </div>
      ) : (
        <EstadoVazio
          icone={CameraIcon}
          titulo="Nenhuma foto ainda"
          descricao="Fotografe o aparelho na entrada: é o registro do estado em que ele chegou."
        />
      )}

      <form
        ref={formulario}
        action={acao}
        onReset={() => setArquivo("")}
        className="space-y-3 border-t border-borda p-5"
      >
        <input type="hidden" name="id" value={id} />

        <EscolhaDeImagem
          nome={arquivo}
          aoEscolher={setArquivo}
          titulo="Tirar ou escolher uma foto"
          dica={`JPG, PNG ou WebP, até ${TAMANHO_MAXIMO_DA_FOTO_EM_MB} MB`}
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
          <button
            type="submit"
            disabled={enviando}
            className={juntar(botao("secundario"), "max-sm:w-full")}
          >
            <UploadSimpleIcon size={15} />
            {enviando ? "Enviando..." : "Adicionar foto"}
          </button>
        </div>

        {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
      </form>
    </Cartao>
  );
}
