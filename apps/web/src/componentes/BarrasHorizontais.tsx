import Link from "next/link";
import { juntar } from "@/componentes/ui/estilos";

export type LinhaComBarra = {
  chave: string;
  rotulo: React.ReactNode;
  medida: number;
  valor: string;
  marca?: React.ReactNode;
  href?: string;
};

type Props = {
  linhas: LinhaComBarra[];
  empilhada?: boolean;
  larguraDoValor?: string;
};

function Barra({ fracao }: { fracao: number }) {
  if (fracao <= 0) return null;
  return (
    <span
      className="block h-2 rounded-r-sm bg-texto-apagado"
      style={{ width: `${Math.max(fracao * 100, 2)}%` }}
    />
  );
}

function Rotulo({ linha, vazia }: { linha: LinhaComBarra; vazia: boolean }) {
  return (
    <span
      className={juntar(
        "flex min-w-0 items-center gap-2.5 text-sm",
        vazia && "text-texto-apagado",
      )}
    >
      {linha.marca}
      <span className="truncate">{linha.rotulo}</span>
    </span>
  );
}

function Valor({
  linha,
  vazia,
  largura,
}: {
  linha: LinhaComBarra;
  vazia: boolean;
  largura: string;
}) {
  return (
    <span
      className={juntar(
        "shrink-0 text-right text-sm tabular-nums",
        largura,
        vazia ? "text-texto-apagado" : "font-medium",
      )}
    >
      {linha.valor}
    </span>
  );
}

function ConteudoEmLinha({
  linha,
  fracao,
  largura,
}: {
  linha: LinhaComBarra;
  fracao: number;
  largura: string;
}) {
  const vazia = linha.medida === 0;
  return (
    <>
      <span className="min-w-0 flex-1 sm:w-52 sm:flex-none">
        <Rotulo linha={linha} vazia={vazia} />
      </span>
      <span className="hidden flex-1 items-center sm:flex" aria-hidden="true">
        <Barra fracao={fracao} />
      </span>
      <Valor linha={linha} vazia={vazia} largura={largura} />
    </>
  );
}

function ConteudoEmpilhado({
  linha,
  fracao,
  largura,
}: {
  linha: LinhaComBarra;
  fracao: number;
  largura: string;
}) {
  const vazia = linha.medida === 0;
  return (
    <span className="block w-full space-y-1.5">
      <span className="flex items-center justify-between gap-3">
        <Rotulo linha={linha} vazia={vazia} />
        <Valor linha={linha} vazia={vazia} largura={largura} />
      </span>
      <span className="flex" aria-hidden="true">
        <Barra fracao={fracao} />
      </span>
    </span>
  );
}

export function BarrasHorizontais({ linhas, empilhada = false, larguraDoValor = "w-10" }: Props) {
  const maior = Math.max(...linhas.map((linha) => linha.medida), 0);
  const Conteudo = empilhada ? ConteudoEmpilhado : ConteudoEmLinha;
  const espaco = "flex items-center gap-4 px-5 py-2.5";

  return (
    <ul className="divide-y divide-borda">
      {linhas.map((linha) => {
        const fracao = maior > 0 ? linha.medida / maior : 0;
        const conteudo = <Conteudo linha={linha} fracao={fracao} largura={larguraDoValor} />;
        return (
          <li key={linha.chave}>
            {linha.href ? (
              <Link href={linha.href} className={juntar(espaco, "transition-colors hover:bg-realce")}>
                {conteudo}
              </Link>
            ) : (
              <div className={espaco}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
