import type { Icon } from "@/componentes/icones";

type Props = {
  icone: Icon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
};

export function EstadoVazio({ icone: Icone, titulo, descricao, acao }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <Icone size={36} weight="light" className="text-icone" />
      <p className="mt-3 text-[15px] font-semibold">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-texto-apagado">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
