import { CircleAlert, CircleCheck } from "lucide-react";

type Props = { tipo: "erro" | "sucesso"; children: React.ReactNode };

export function Mensagem({ tipo, children }: Props) {
  if (tipo === "erro") {
    return (
      <p role="alert" className="flex items-start gap-2 text-[13px] text-perigo-forte">
        <CircleAlert size={15} strokeWidth={2} className="mt-px shrink-0" />
        <span>{children}</span>
      </p>
    );
  }

  return (
    <p role="status" className="flex items-start gap-2 text-[13px] text-texto-suave">
      <CircleCheck size={15} strokeWidth={2} className="mt-px shrink-0 text-sucesso" />
      <span>{children}</span>
    </p>
  );
}
