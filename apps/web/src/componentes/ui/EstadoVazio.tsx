type Props = {
  icone: React.ReactNode;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
};

export function EstadoVazio({ icone, titulo, descricao, acao }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border border-borda bg-realce text-texto-suave">
        {icone}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{titulo}</p>
        {descricao && <p className="max-w-sm text-[13px] text-texto-suave">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
