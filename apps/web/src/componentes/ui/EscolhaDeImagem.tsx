"use client";

import { CameraPlusIcon, type Icon } from "@/componentes/icones";

type Props = {
  nome: string;
  aoEscolher: (nome: string) => void;
  titulo: string;
  dica: string;
  icone?: Icon;
};

export function EscolhaDeImagem({
  nome,
  aoEscolher,
  titulo,
  dica,
  icone: Icone = CameraPlusIcon,
}: Props) {
  return (
    <label className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 border-dashed border-borda-forte bg-realce px-4 py-4 transition-colors duration-150 hover:border-anel has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-anel">
      <Icone
        size={28}
        className="shrink-0 text-icone transition-colors duration-150 group-hover:text-destaque"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{nome || titulo}</span>
        <span className="block text-[13px] text-texto-apagado sm:text-xs">
          {nome ? "Toque para trocar" : dica}
        </span>
      </span>
      <input
        type="file"
        name="arquivo"
        accept="image/jpeg,image/png,image/webp"
        onChange={(evento) => aoEscolher(evento.target.files?.[0]?.name ?? "")}
        className="sr-only"
      />
    </label>
  );
}
