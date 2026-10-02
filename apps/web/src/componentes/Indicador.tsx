import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

type Props = {
  rotulo: string;
  valor: string;
  nota?: React.ReactNode;
  href?: string;
  alerta?: boolean;
};

export function Indicador({ rotulo, valor, nota, href, alerta = false }: Props) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-texto-suave">{rotulo}</p>
        {href && (
          <ArrowUpRight
            size={14}
            strokeWidth={2}
            className="text-texto-apagado opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </div>
      <p
        className={`mt-2 text-[28px] leading-none font-semibold tracking-tight ${alerta ? "text-perigo-forte" : ""}`}
      >
        {valor}
      </p>
      {nota && <div className="mt-2 text-xs text-texto-apagado">{nota}</div>}
    </>
  );

  if (!href) return <div className="bg-superficie p-5">{conteudo}</div>;

  return (
    <Link href={href} className="group block bg-superficie p-5 transition-colors hover:bg-realce">
      {conteudo}
    </Link>
  );
}

const COLUNAS = {
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export function GradeDeIndicadores({
  children,
  tour,
  colunas = 4,
}: {
  children: React.ReactNode;
  tour?: string;
  colunas?: 2 | 3 | 4;
}) {
  return (
    <div
      data-tour={tour}
      className={`grid gap-px overflow-hidden rounded-xl border border-borda bg-borda shadow-sutil ${COLUNAS[colunas]}`}
    >
      {children}
    </div>
  );
}
