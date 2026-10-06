import type { Icon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";

type Props = {
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  icone?: Icon;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  semEspaco?: boolean;
  className?: string;
  tour?: string;
};

export function Cartao({
  titulo,
  descricao,
  icone: Icone,
  acoes,
  children,
  semEspaco = false,
  className,
  tour,
}: Props) {
  return (
    <section
      data-tour={tour}
      className={juntar(
        "overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao",
        className,
      )}
    >
      {(titulo || acoes) && (
        <header className="flex items-center justify-between gap-4 border-b border-borda px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icone && <Icone size={20} className="shrink-0 text-icone" />}
            <div className="min-w-0">
              {titulo && <h2 className="text-[15px] leading-snug font-semibold">{titulo}</h2>}
              {descricao && <p className="mt-0.5 text-[13px] text-texto-apagado">{descricao}</p>}
            </div>
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={semEspaco ? "" : "p-5"}>{children}</div>
    </section>
  );
}
