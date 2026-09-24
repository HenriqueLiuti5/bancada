import Link from "next/link";
import { Marca } from "@/componentes/ui/Marca";
import { link } from "@/componentes/ui/estilos";

type Props = { titulo: string; versao: string; children: React.ReactNode };

export function TextoLegal({ titulo, versao, children }: Props) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 space-y-4">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <Marca />
          <span className="text-sm font-semibold">Bancada</span>
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-[13px] text-texto-suave">Versão {versao}</p>
        </div>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-texto-suave [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-texto">
        {children}
      </div>

      <p className="mt-10 text-sm">
        <Link href="/cadastro" className={link}>
          Voltar para o cadastro
        </Link>
      </p>
    </main>
  );
}
