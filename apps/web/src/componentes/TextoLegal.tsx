import Link from "next/link";
import { CaretLeftIcon } from "@/componentes/icones";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";

type Props = { titulo: string; versao: string; children: React.ReactNode };

export function TextoLegal({ titulo, versao, children }: Props) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 space-y-6">
        <Link href="/login" className="inline-flex items-center gap-3 rounded-full">
          <Marca />
          <NomeDaMarca />
        </Link>
        <div className="space-y-1">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">{titulo}</h1>
          <p className="text-[13px] text-texto-apagado">Versão {versao}</p>
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-borda bg-superficie p-6 text-[15px] leading-relaxed text-texto-suave shadow-cartao sm:p-8 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-texto">
        {children}
      </div>

      <Link
        href="/cadastro"
        className="mt-8 inline-flex items-center gap-1 rounded-full py-1 pr-3 pl-1.5 text-sm font-semibold text-destaque transition-colors hover:bg-realce"
      >
        <CaretLeftIcon size={16} />
        Voltar para o cadastro
      </Link>
    </main>
  );
}
