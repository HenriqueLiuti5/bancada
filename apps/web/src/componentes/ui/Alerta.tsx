import type { Icon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

type Tom = "info" | "aviso" | "perigo";

const TONS: Record<Tom, string> = {
  info: "text-destaque",
  aviso: "text-aviso",
  perigo: "text-perigo",
};

type Props = {
  tom: Tom;
  icone: Icon;
  titulo: React.ReactNode;
  children?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
};

export function Alerta({ tom, icone: Icone, titulo, children, acao, className }: Props) {
  return (
    <div
      className={juntar(
        "flex items-start gap-3 rounded-2xl border border-borda bg-superficie p-4 shadow-cartao sm:items-center sm:px-5",
        className,
      )}
    >
      <Icone size={22} weight="fill" className={`shrink-0 max-sm:mt-px ${TONS[tom]}`} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <p className="text-sm leading-snug font-semibold text-texto">{titulo}</p>
          {children && (
            <p className="mt-0.5 text-sm leading-snug text-texto-apagado sm:text-[13px]">{children}</p>
          )}
        </div>
        {acao}
      </div>
    </div>
  );
}
