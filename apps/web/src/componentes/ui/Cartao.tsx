type Props = {
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  semEspaco?: boolean;
  className?: string;
  tour?: string;
};

export function Cartao({
  titulo,
  descricao,
  acoes,
  children,
  semEspaco = false,
  className = "",
  tour,
}: Props) {
  return (
    <section
      data-tour={tour}
      className={`overflow-hidden rounded-xl border border-borda bg-superficie shadow-sutil ${className}`}
    >
      {(titulo || acoes) && (
        <header className="flex items-start justify-between gap-4 border-b border-borda px-5 py-3.5">
          <div className="min-w-0">
            {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-[13px] text-texto-suave">{descricao}</p>}
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={semEspaco ? "" : "p-5"}>{children}</div>
    </section>
  );
}
