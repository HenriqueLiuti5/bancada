import { PontoDeStatus } from "@/componentes/ui/Selo";

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
        <li key={etapa.chave} className="group relative flex gap-3 pb-5 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute top-4 bottom-0 left-[3.5px] w-px bg-borda group-last:hidden"
          />
          <span className="relative mt-[5px] flex w-2 shrink-0 justify-center">
            {etapa.atual ? (
              <PontoDeStatus status={etapa.status} tamanho="md" />
            ) : (
              <span className="size-2 rounded-full border border-borda-forte bg-superficie" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className={`text-sm ${etapa.atual ? "font-medium" : ""}`}>{etapa.titulo}</p>
            {etapa.detalhes && <p className="text-xs text-texto-suave">{etapa.detalhes}</p>}
            {etapa.complemento}
          </div>
        </li>
      ))}
    </ol>
  );
}
