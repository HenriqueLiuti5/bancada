import Link from "next/link";
import { CaretRightIcon, type Icon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

type Props = {
  rotulo: string;
  valor: string;
  icone: Icon;
  nota?: React.ReactNode;
  href?: string;
  alerta?: boolean;
};

const CAIXA = "rounded-2xl border border-borda bg-superficie p-4 shadow-cartao sm:p-5";

export function Indicador({ rotulo, valor, icone: Icone, nota, href, alerta = false }: Props) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-3">
        <Icone size={22} className={alerta ? "text-perigo" : "text-icone"} />
        {href && (
          <CaretRightIcon
            size={18}
            className="text-texto-apagado transition-transform duration-150 group-hover:translate-x-0.5"
          />
        )}
      </div>
      <p className="mt-4 text-[13px] font-medium text-texto-apagado sm:text-sm">{rotulo}</p>
      <p
        className={juntar(
          "mt-1 text-[22px] leading-tight font-bold tracking-tight tabular-nums sm:text-[28px]",
          alerta && "text-perigo",
        )}
      >
        {valor}
      </p>
      {nota && <div className="mt-1 text-xs text-texto-apagado">{nota}</div>}
    </>
  );

  if (!href) return <div className={CAIXA}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={juntar(
        CAIXA,
        "group block transition-[border-color,box-shadow] duration-150 hover:border-borda-forte hover:shadow-elevada",
      )}
    >
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
    <div data-tour={tour} className={`grid gap-3 sm:gap-4 ${COLUNAS[colunas]}`}>
      {children}
    </div>
  );
}
