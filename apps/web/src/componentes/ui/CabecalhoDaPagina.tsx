import Link from "next/link";
import { CaretLeftIcon } from "@/componentes/icones";

type Props = {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  junto?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
};

export function CabecalhoDaPagina({ titulo, descricao, acoes, junto, voltar }: Props) {
  return (
    <header className="mb-6 space-y-3 sm:mb-8">
      {voltar && (
        <Link
          href={voltar.href}
          className="-ml-2 inline-flex items-center gap-1 rounded-full py-1 pr-3 pl-1.5 text-sm font-medium text-texto-suave transition-colors hover:bg-realce hover:text-texto"
        >
          <CaretLeftIcon size={16} />
          {voltar.rotulo}
        </Link>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-[28px]">{titulo}</h1>
            {junto}
          </div>
          {descricao && <p className="text-sm text-texto-apagado">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}
