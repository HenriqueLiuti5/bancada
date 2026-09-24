type Props = {
  rotulo: string;
  htmlFor?: string;
  dica?: React.ReactNode;
  erro?: string;
  acessorio?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

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
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-texto">
          {rotulo}
        </label>
        {acessorio}
      </div>
      {children}
      {erro ? (
        <p id={htmlFor ? `${htmlFor}-erro` : undefined} className="text-xs text-perigo-forte">
          {erro}
        </p>
      ) : (
        dica && <p className="text-xs text-texto-apagado">{dica}</p>
      )}
    </div>
  );
}
