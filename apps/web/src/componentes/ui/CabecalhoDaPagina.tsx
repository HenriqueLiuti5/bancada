import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  junto?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
};

export function CabecalhoDaPagina({ titulo, descricao, acoes, junto, voltar }: Props) {
  return (
    <header className="mb-8 space-y-3">
      {voltar && (
        <Link
          href={voltar.href}
          className="inline-flex items-center gap-0.5 text-[13px] text-texto-suave transition-colors hover:text-texto"
        >
          <ChevronLeft size={14} strokeWidth={2} />
          {voltar.rotulo}
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
            {junto}
          </div>
          {descricao && <p className="text-sm text-texto-suave">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}
