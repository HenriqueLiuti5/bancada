export function Marca({ tamanho = "sm" }: { tamanho?: "sm" | "md" }) {
  const medida = tamanho === "md" ? "size-9 text-base rounded-[10px]" : "size-7 text-[13px] rounded-lg";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-primario font-semibold tracking-tight text-primario-texto ${medida}`}
    >
      B
    </span>
  );
}
