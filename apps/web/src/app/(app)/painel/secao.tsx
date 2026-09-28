export function Secao({
  titulo,
  descricao,
  tour,
  children,
}: {
  titulo: string;
  descricao?: string;
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-tour={tour} className="space-y-3">
      <header>
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-[13px] text-texto-suave">{descricao}</p>}
      </header>
      {children}
    </section>
  );
}
