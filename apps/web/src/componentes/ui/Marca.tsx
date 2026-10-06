import { juntar } from "@/componentes/ui/estilos";

const MEDIDAS = { sm: "size-8", md: "size-10" };

type Props = { tamanho?: keyof typeof MEDIDAS; className?: string };

export function Marca({ tamanho = "sm", className }: Props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={juntar("shrink-0", MEDIDAS[tamanho], className)}>
      <rect width="32" height="32" rx="10" className="fill-primario" />
      <path
        d="M11 15.5h5.25a3.5 3.5 0 0 0 0-7H11v15h6.25a4 4 0 0 0 0-8z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NomeDaMarca({ className }: { className?: string }) {
  return (
    <span className={juntar("text-lg leading-none font-bold tracking-tight", className)}>Bancada</span>
  );
}
