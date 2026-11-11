import { juntar } from "@/componentes/ui/estilos";

const MEDIDAS = { sm: "size-8", md: "size-10" };

type Props = { tamanho?: keyof typeof MEDIDAS; className?: string };

export function Marca({ tamanho = "sm", className }: Props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={juntar("shrink-0", MEDIDAS[tamanho], className)}>
      <rect width="32" height="32" rx="10" className="fill-primario" />
      <path
        d="M11 23.5v-15h5.5a3.5 3.5 0 0 1 0 7H11m4.5 0 5.5 8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NomeDaMarca({ className }: { className?: string }) {
  return (
    <span className={juntar("text-lg leading-none font-bold tracking-tight", className)}>Reparium</span>
  );
}
