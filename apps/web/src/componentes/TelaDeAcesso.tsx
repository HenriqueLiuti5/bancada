import { Marca } from "@/componentes/ui/Marca";

type Props = {
  titulo: string;
  descricao?: React.ReactNode;
  rodape?: React.ReactNode;
  larga?: boolean;
  children: React.ReactNode;
};

export function TelaDeAcesso({ titulo, descricao, rodape, larga = false, children }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className={`w-full space-y-8 ${larga ? "max-w-md" : "max-w-sm"}`}>
        <header className="flex flex-col items-center gap-4 text-center">
          <Marca tamanho="md" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
            {descricao && <p className="text-sm text-texto-suave">{descricao}</p>}
          </div>
        </header>

        <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sutil">{children}</div>

        {rodape && <div className="text-center text-sm text-texto-suave">{rodape}</div>}
      </div>
    </main>
  );
}
