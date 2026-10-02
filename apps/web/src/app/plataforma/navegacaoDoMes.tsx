import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { botao, juntar } from "@/componentes/ui/estilos";
import { mesPorExtenso } from "@/lib/datas";
import type { MesesDoPainel } from "@/lib/tipos";

function Seta({ mes, rotulo, children }: { mes: string | null; rotulo: string; children: React.ReactNode }) {
  const estilo = juntar(botao("secundario", "sm"), "px-2");
  if (!mes) {
    return (
      <span aria-hidden="true" className={juntar(estilo, "pointer-events-none opacity-40")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/plataforma?mes=${mes}`} title={rotulo} className={estilo}>
      {children}
      <span className="sr-only">{rotulo}</span>
    </Link>
  );
}

export function NavegacaoDoMes({ meses }: { meses: MesesDoPainel }) {
  return (
    <nav aria-label="Mês dos números" className="flex items-center gap-2">
      <Seta mes={meses.anterior} rotulo="Mês anterior">
        <ChevronLeft size={15} strokeWidth={2} />
      </Seta>
      <span className="min-w-36 text-center text-sm font-medium first-letter:uppercase">
        {mesPorExtenso(meses.escolhido)}
      </span>
      <Seta mes={meses.seguinte} rotulo="Mês seguinte">
        <ChevronRight size={15} strokeWidth={2} />
      </Seta>
    </nav>
  );
}
