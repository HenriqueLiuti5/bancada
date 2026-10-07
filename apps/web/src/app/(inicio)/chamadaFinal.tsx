import Link from "next/link";
import { ArrowRightIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { conteiner } from "./secao";

export function ChamadaFinal({ diasDeTeste }: { diasDeTeste: number }) {
  return (
    <section className="bg-lateral text-lateral-texto">
      <div className={juntar(conteiner, "revelar max-w-4xl py-20 text-center sm:py-24")}>
        <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          A próxima ordem que chegar ao balcão já pode sair organizada
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-lateral-texto-suave">
          Fotos na entrada, link para o cliente acompanhar e recibo com garantia na entrega. Crie a
          conta e comece hoje.
        </p>
        <Link
          href="/cadastro"
          className={juntar(
            botao("primario", "lg"),
            "mt-9 w-full focus-visible:outline-lateral-anel sm:w-auto",
          )}
        >
          Testar grátis por {diasDeTeste} dias
          <ArrowRightIcon size={18} />
        </Link>
        <p className="mt-4 text-sm text-lateral-texto-suave">
          Sem cartão de crédito · Sem instalar nada
        </p>
      </div>
    </section>
  );
}
