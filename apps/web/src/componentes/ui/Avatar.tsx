function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

type Props = { nome: string; tamanho?: "sm" | "md"; naLateral?: boolean };

export function Avatar({ nome, tamanho = "sm", naLateral = false }: Props) {
  const medida = tamanho === "md" ? "size-10 text-[13px]" : "size-9 text-xs";
  const cor = naLateral
    ? "bg-lateral-realce text-lateral-texto"
    : "border border-borda-forte bg-superficie text-texto-suave";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${cor} ${medida}`}
    >
      {iniciais(nome)}
    </span>
  );
}
