import { juntar } from "@/componentes/ui/estilos";

const MEDIDAS = { sm: "size-8", md: "size-10" };

type Props = { tamanho?: keyof typeof MEDIDAS; className?: string };

// O "r" é desenhado, e não escrito com a fonte, porque o ícone da aba e o da tela do celular não
// carregam a fonte do site. O mesmo desenho está em app/icon.svg.
export function Marca({ tamanho = "sm", className }: Props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={juntar("shrink-0", MEDIDAS[tamanho], className)}>
      <rect width="64" height="64" rx="18" className="fill-lateral" />
      <path d="M16.5 47V17H34v7.5c-5.2 0-9.4 3.2-9.4 7.2V47z" className="fill-lateral-texto" />
      <rect x="37" y="36.5" width="10.5" height="10.5" rx="2.2" className="fill-primario" />
    </svg>
  );
}

export function NomeDaMarca({ className }: { className?: string }) {
  return (
    <span className={juntar("text-2xl leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap", className)}>
      reparium
      <span aria-hidden="true" className="ml-[0.07em] inline-block size-[0.19em] rounded-[0.04em] bg-primario" />
    </span>
  );
}
