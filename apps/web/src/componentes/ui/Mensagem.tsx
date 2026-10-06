import { CheckCircleIcon, WarningCircleIcon } from "@/componentes/icones";

type Props = { tipo: "erro" | "sucesso"; children: React.ReactNode };

export function Mensagem({ tipo, children }: Props) {
  if (tipo === "erro") {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-perigo sm:text-[13px]">
        <WarningCircleIcon size={16} className="mt-px shrink-0" />
        <span>{children}</span>
      </p>
    );
  }

  return (
    <p role="status" className="flex items-start gap-2 text-sm text-texto-suave sm:text-[13px]">
      <CheckCircleIcon size={16} className="mt-px shrink-0 text-sucesso" />
      <span>{children}</span>
    </p>
  );
}
