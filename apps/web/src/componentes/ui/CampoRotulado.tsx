import { juntar } from "@/componentes/ui/estilos";

type Props = {
  rotulo: string;
  htmlFor?: string;
  dica?: React.ReactNode;
  erro?: string;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const CAMPO_COM_ERRO =
  "[&_input]:border-perigo [&_select]:border-perigo [&_textarea]:border-perigo [&_input]:focus:border-perigo [&_select]:focus:border-perigo [&_textarea]:focus:border-perigo [&_input]:focus:ring-perigo/15 [&_select]:focus:ring-perigo/15 [&_textarea]:focus:ring-perigo/15";

export function CampoRotulado({
  rotulo,
  htmlFor,
  dica,
  erro,
  acessorio,
  children,
  className = "",
}: Props) {
  return (
    <div className={juntar("space-y-1.5", erro && CAMPO_COM_ERRO, className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-texto sm:text-[13px]">
          {rotulo}
        </label>
        {acessorio}
      </div>
      {children}
      {erro ? (
        <p
          id={htmlFor ? `${htmlFor}-erro` : undefined}
          className="text-[13px] text-perigo sm:text-xs"
        >
          {erro}
        </p>
      ) : (
        dica && <p className="text-[13px] text-texto-apagado sm:text-xs">{dica}</p>
      )}
    </div>
  );
}
