import type { Icon } from "@/componentes/icones";

export function Secao({
  titulo,
  descricao,
  icone: Icone,
  tour,
  children,
}: {
  titulo: string;
  descricao?: string;
  icone?: Icon;
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-tour={tour} className="space-y-4">
      <header className="flex items-start gap-2.5">
        {Icone && <Icone size={22} className="mt-px shrink-0 text-icone" />}
        <div>
          <h2 className="text-lg leading-snug font-bold tracking-tight">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-[13px] text-texto-apagado">{descricao}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
