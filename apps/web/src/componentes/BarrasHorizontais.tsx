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
  dinheiro?: boolean;
};

function Barra({ fracao }: { fracao: number }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-realce">
      {fracao > 0 && (
        <span
          className="block h-full rounded-full bg-grafico"
          style={{ width: `${Math.max(fracao * 100, 3)}%` }}
        />
      )}
    </span>
  );
}

function Rotulo({ linha, vazia }: { linha: LinhaComBarra; vazia: boolean }) {
  return (
    <span
      className={juntar(
        "flex min-w-0 items-center gap-2 text-sm font-medium",
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
  dinheiro,
}: {
  linha: LinhaComBarra;
  vazia: boolean;
  largura: string;
  dinheiro: boolean;
}) {
  return (
    <span
      className={juntar(
        "shrink-0 text-right text-sm tabular-nums",
        largura,
        vazia ? "text-texto-apagado" : "font-semibold",
        dinheiro && "text-dinheiro",
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
  dinheiro,
}: {
  linha: LinhaComBarra;
  fracao: number;
  largura: string;
  dinheiro: boolean;
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
      <Valor linha={linha} vazia={vazia} largura={largura} dinheiro={dinheiro} />
    </>
  );
}

function ConteudoEmpilhado({
  linha,
  fracao,
  largura,
  dinheiro,
}: {
  linha: LinhaComBarra;
  fracao: number;
  largura: string;
  dinheiro: boolean;
}) {
  const vazia = linha.medida === 0;
  return (
    <span className="block w-full space-y-2">
      <span className="flex items-center justify-between gap-3">
        <Rotulo linha={linha} vazia={vazia} />
        <Valor linha={linha} vazia={vazia} largura={largura} dinheiro={dinheiro} />
      </span>
      <span className="flex" aria-hidden="true">
        <Barra fracao={fracao} />
      </span>
    </span>
  );
}

export function BarrasHorizontais({
  linhas,
  empilhada = false,
  larguraDoValor = "w-10",
  dinheiro = false,
}: Props) {
  const maior = Math.max(...linhas.map((linha) => linha.medida), 0);
  const Conteudo = empilhada ? ConteudoEmpilhado : ConteudoEmLinha;
  const espaco = "flex items-center gap-4 rounded-xl px-3 py-2.5";

  return (
    <ul className="space-y-0.5 p-2">
      {linhas.map((linha) => {
        const fracao = maior > 0 ? linha.medida / maior : 0;
        const conteudo = (
          <Conteudo linha={linha} fracao={fracao} largura={larguraDoValor} dinheiro={dinheiro} />
        );
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
