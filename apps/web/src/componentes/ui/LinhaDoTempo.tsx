import { CirculoDeStatus } from "@/componentes/ui/Selo";

export type Etapa = {
  chave: string | number;
  status: string;
  titulo: React.ReactNode;
  detalhes?: React.ReactNode;
  complemento?: React.ReactNode;
  atual?: boolean;
};

export function LinhaDoTempo({ etapas }: { etapas: Etapa[] }) {
  return (
    <ol>
      {etapas.map((etapa) => (
        <li key={etapa.chave} className="group relative flex gap-3.5 pb-6 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute top-10 bottom-1 left-4 w-px -translate-x-1/2 bg-borda group-last:hidden"
          />
          <CirculoDeStatus status={etapa.status} apagado={!etapa.atual} />
          <div className="min-w-0 flex-1 space-y-0.5 pt-1.5">
            <p className={`text-sm ${etapa.atual ? "font-semibold" : "font-medium"}`}>{etapa.titulo}</p>
            {etapa.detalhes && (
              <p className="text-[13px] text-texto-apagado sm:text-xs">{etapa.detalhes}</p>
            )}
            {etapa.complemento}
          </div>
        </li>
      ))}
    </ol>
  );
}
