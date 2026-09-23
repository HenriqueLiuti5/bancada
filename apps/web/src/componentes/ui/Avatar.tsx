function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function Avatar({ nome, tamanho = "sm" }: { nome: string; tamanho?: "sm" | "md" }) {
  const medida = tamanho === "md" ? "size-9 text-xs" : "size-7 text-[11px]";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-borda bg-realce font-medium text-texto-suave ${medida}`}
    >
      {iniciais(nome)}
    </span>
  );
}
