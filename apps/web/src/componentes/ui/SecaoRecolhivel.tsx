import { CaretDownIcon, type Icon } from "@/componentes/icones";

type Props = {
  titulo: string;
  icone: Icon;
  resumo?: string;
  abertaDeInicio?: boolean;
  tour?: string;
  children: React.ReactNode;
};

export function SecaoRecolhivel({
  titulo,
  icone: Icone,
  resumo,
  abertaDeInicio = false,
  tour,
  children,
}: Props) {
  return (
    <details
      data-tour={tour}
      open={abertaDeInicio}
      className="group overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-realce [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icone size={20} className="shrink-0 text-icone" />
          <span className="text-[15px] leading-snug font-semibold">{titulo}</span>
          {resumo && <span className="truncate text-[13px] text-texto-apagado">{resumo}</span>}
        </span>
        <CaretDownIcon
          size={18}
          className="shrink-0 text-icone transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-borda">{children}</div>
    </details>
  );
}
