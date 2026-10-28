import type { Metadata } from "next";
import Link from "next/link";
import { Acompanhamento } from "@/componentes/Acompanhamento";
import { Estatisticas } from "@/componentes/Estatisticas";
import { ArrowRightIcon } from "@/componentes/icones";
import { Marca, NomeDaMarca } from "@/componentes/ui/Marca";
import { botao, juntar } from "@/componentes/ui/estilos";
import {
  ETAPAS_DA_DEMONSTRACAO,
  acompanhamentoDeExemplo,
  etapaDaDemonstracao,
} from "@/lib/demonstracao";
import { buscarOferta } from "@/lib/oferta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demonstração · Bancada",
  description:
    "Veja a página que o cliente da sua assistência abre para acompanhar o conserto pelo celular.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ etapa?: string | string[] }> };

export default async function Demonstracao({ searchParams }: Props) {
  const etapa = etapaDaDemonstracao((await searchParams).etapa);
  const oferta = await buscarOferta();

  return (
    <>
      <div className="border-b border-borda bg-superficie">
        <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-full">
              <Marca />
              <NomeDaMarca />
            </Link>
            <Link href="/cadastro" className={botao("primario", "sm")}>
              Testar grátis
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-bold">Demonstração: a página que o seu cliente recebe</p>
            <p className="text-sm text-texto-apagado">
              Escolha uma etapa para ver o que ele encontra em cada momento do conserto.
            </p>
          </div>
          <nav aria-label="Etapas do conserto" className="grid grid-cols-5 gap-1 rounded-full bg-realce p-1">
            {ETAPAS_DA_DEMONSTRACAO.map(({ valor, rotulo }) => (
              <Link
                key={valor}
                href={`/demonstracao?etapa=${valor}`}
                scroll={false}
                aria-current={valor === etapa ? "page" : undefined}
                className={juntar(
                  "rounded-full py-2 text-center text-xs whitespace-nowrap transition-colors duration-150 sm:text-[13px]",
                  valor === etapa
                    ? "bg-superficie font-semibold text-texto shadow-suave"
                    : "font-medium text-texto-apagado hover:text-texto",
                )}
              >
                {rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <Acompanhamento dados={acompanhamentoDeExemplo(etapa)} demonstracao />

      <section className="border-t border-borda bg-superficie">
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <h2 className="text-2xl leading-tight font-bold tracking-tight text-balance">
            Quer isso para os clientes da sua assistência?
          </h2>
          <p className="mt-2 text-[15px] text-texto-apagado text-pretty">
            Com o nome e a logo da sua loja. São {oferta.dias_de_teste} dias grátis, sem cartão de
            crédito.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link href="/cadastro" className={juntar(botao("primario"), "w-full sm:w-auto")}>
              Testar grátis
              <ArrowRightIcon size={17} />
            </Link>
            <Link href="/" className={botao("fantasma", "sm")}>
              Conhecer o Bancada
            </Link>
          </div>
        </div>
      </section>
      <Estatisticas />
    </>
  );
}
