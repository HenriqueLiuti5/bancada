type Props = {
  rotulo: string;
  htmlFor?: string;
  dica?: string;
  children: React.ReactNode;
  className?: string;
};

export function CampoRotulado({ rotulo, htmlFor, dica, children, className = "" }: Props) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-texto">
        {rotulo}
      </label>
      {children}
      {dica && <p className="text-xs text-texto-apagado">{dica}</p>}
    </div>
  );
}
