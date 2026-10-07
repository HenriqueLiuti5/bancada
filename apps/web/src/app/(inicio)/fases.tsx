import { StorefrontIcon, UserIcon, UsersIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import { CabecalhoDaSecao, conteiner } from "./secao";

const FASES = [
  {
    icone: UserIcon,
    titulo: "Sozinho no balcão",
    texto:
      "Você atende, conserta e entrega. O Bancada guarda cada ordem, avisa o cliente e mostra o que está atrasado.",
  },
  {
    icone: UsersIcon,
    titulo: "Com técnico e atendente",
    texto:
      "Cada pessoa entra com o próprio e-mail e um papel. O atendente abre ordens, o técnico conserta e você vê tudo, inclusive o dinheiro.",
  },
  {
    icone: StorefrontIcon,
    titulo: "Mais de uma loja",
    texto:
      "Cada ordem sabe de que loja é, o cliente vê o nome da loja certa e o painel separa os números. Peça pelo WhatsApp e cadastramos as outras lojas.",
  },
];

export function Fases() {
  return (
    <section id="para-quem" className="scroll-mt-16 border-t border-borda bg-superficie">
      <div className={juntar(conteiner, "py-20 sm:py-28")}>
        <CabecalhoDaSecao
          sobretitulo="Para quem"
          titulo="Serve no primeiro dia e continua servindo quando a loja cresce"
          descricao="Do balcão de uma pessoa só à assistência com equipe e mais de um endereço."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {FASES.map(({ icone: Icone, titulo, texto }, indice) => (
            <li
              key={titulo}
              className="revelar rounded-3xl border border-borda bg-superficie p-7 shadow-cartao"
            >
              <div className="flex items-center justify-between">
                <Icone size={28} className="text-icone" />
                <span className="text-sm font-semibold text-texto-apagado tabular-nums">
                  {indice + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold tracking-tight">{titulo}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-pretty text-texto-suave">
                {texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
