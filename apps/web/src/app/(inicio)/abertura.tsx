import Link from "next/link";
import { ArrowRightIcon, CheckIcon, DeviceMobileIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { TelaDoCelular, TelaDoComputador } from "./molduras";
import { conteiner } from "./secao";
import telaDoCliente from "./telas/acompanhamento-em-reparo.png";
import telaDasOrdens from "./telas/lista-de-ordens.png";

export function Abertura({ diasDeTeste }: { diasDeTeste: number }) {
  const garantias = [`${diasDeTeste} dias grátis`, "Sem cartão de crédito", "Sem instalar nada"];

  return (
    <section className="overflow-hidden bg-superficie">
      <div className={juntar(conteiner, "pt-14 pb-20 sm:pt-20 md:pb-28 lg:pt-24")}>
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold text-destaque">
            Sistema de ordem de serviço para assistência técnica de celular
          </p>
          <h1 className="mt-4 text-[40px] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Sua assistência organizada, do balcão à entrega
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-texto-suave sm:text-xl">
            Abra a ordem em um minuto, fotografe o aparelho e mande ao cliente um link para
            acompanhar o conserto pelo celular. Ele fica tranquilo, e você para de responder “já
            ficou pronto?”.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={botao("primario", "lg")}>
              Testar grátis
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/demonstracao" className={botao("secundario", "lg")}>
              <DeviceMobileIcon size={18} />
              Ver o que o cliente recebe
            </Link>
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-texto-apagado">
            {garantias.map((garantia) => (
              <li key={garantia} className="flex items-center gap-1.5">
                <CheckIcon size={16} weight="bold" className="text-destaque" />
                {garantia}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16 lg:mt-20">
          <TelaDoComputador
            imagem={telaDasOrdens}
            descricao="Lista de ordens de serviço do Bancada, com o aparelho, o cliente, o técnico, o prazo e o status de cada conserto"
            tamanhos="(min-width: 1088px) 846px, 78vw"
            antecipar
            className="hidden md:block"
          />
          <TelaDoCelular
            imagem={telaDoCliente}
            descricao="Página de acompanhamento no celular do cliente, com o aparelho em reparo, a previsão de entrega e o orçamento aprovado"
            tamanhos="224px"
            antecipar
            className="mx-auto w-60 md:absolute md:-right-4 md:-bottom-14 md:w-52 lg:w-60 xl:-right-12"
          />
        </div>
      </div>
    </section>
  );
}
