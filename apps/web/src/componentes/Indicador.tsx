import Link from "next/link";

type Props = {
  rotulo: string;
  valor: string;
  nota?: string;
  href?: string;
  alerta?: boolean;
};

const CAIXA =
  "block rounded-xl border border-neutral-200 px-5 py-4 dark:border-neutral-800";

export function Indicador({ rotulo, valor, nota, href, alerta = false }: Props) {
  const conteudo = (
    <>
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        {rotulo}
      </p>
      <p
        className={
          alerta
            ? "mt-1 text-3xl font-semibold text-rose-600 dark:text-rose-400"
            : "mt-1 text-3xl font-semibold"
        }
      >
        {valor}
      </p>
      {nota && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{nota}</p>
      )}
    </>
  );

  if (!href) return <div className={CAIXA}>{conteudo}</div>;

  return (
    <Link
      href={href}
      className={`${CAIXA} transition-colors hover:border-neutral-900 dark:hover:border-neutral-300`}
    >
      {conteudo}
    </Link>
  );
}
