import Link from "next/link";
import { CreditCardIcon, HandshakeIcon, ShieldCheckIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { Oferta } from "@/lib/oferta";
import { CabecalhoDaSecao, ListaDeConferencia, conteiner } from "./secao";

const INCLUSO = [
  "Ordens de serviço sem limite",
  "Link de acompanhamento e avisos por e-mail ao cliente",
  "Fotos do aparelho, comprovante de entrada e recibo em PDF",
  "Senha de desbloqueio protegida",
  "Orçamento por item e pagamento na entrega",
  "Estoque de peças e vendas no balcão",
  "Contas a pagar, caixa do dia e lucro do mês",
  "Valores a receber e painel com os números da loja",
  "Equipe com papéis: dono, técnico e atendente",
  "Tutorial dentro do sistema e suporte pelo WhatsApp",
];

const CONDICOES = [
  { icone: CreditCardIcon, texto: "PIX, boleto ou cartão, todo mês" },
  { icone: HandshakeIcon, texto: "Sem fidelidade: cancele quando quiser, na tela Assinatura" },
  { icone: ShieldCheckIcon, texto: "Se não assinar, o sistema fica só para consulta, com tudo guardado por 6 meses" },
];

export function Preco({ oferta }: { oferta: Oferta }) {
  return (
    <section id="preco" className="scroll-mt-16 border-t border-borda bg-fundo">
      <div className={juntar(conteiner, "py-20 sm:py-28")}>
        <CabecalhoDaSecao
          sobretitulo="Preço"
          titulo="Um plano, com tudo incluso"
          descricao="Sem plano básico que deixa o principal de fora e sem cobrança por usuário."
        />

        <div className="revelar mx-auto mt-14 grid max-w-4xl overflow-hidden rounded-3xl border border-borda bg-superficie shadow-cartao lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold text-texto-apagado">Bancada completo</p>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="text-5xl font-extrabold tracking-tight text-dinheiro tabular-nums">
                {emReais(oferta.valor_mensal)}
              </span>
              <span className="text-base font-medium text-texto-apagado">/mês</span>
            </p>
            <p className="mt-2 text-[15px] text-texto-suave">
              por assistência, com quantos usuários você precisar
            </p>

            <Link href="/cadastro" className={juntar(botao("primario", "lg"), "mt-8 w-full")}>
              Testar grátis por {oferta.dias_de_teste} dias
            </Link>
            <p className="mt-3 text-center text-[13px] text-texto-apagado">
              Sem cartão de crédito para testar
            </p>

            <ul className="mt-8 space-y-3.5 border-t border-borda pt-6">
              {CONDICOES.map(({ icone: Icone, texto }) => (
                <li key={texto} className="flex gap-3 text-sm leading-snug text-texto-suave">
                  <Icone size={18} className="shrink-0 text-icone" />
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-borda p-7 sm:p-10 lg:border-t-0 lg:border-l">
            <p className="text-sm font-semibold">Tudo isto já vem incluso</p>
            <div className="mt-5">
              <ListaDeConferencia itens={INCLUSO} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
