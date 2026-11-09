import { CreditCardIcon, HandshakeIcon, ShieldCheckIcon } from "@/componentes/icones";
import { juntar } from "@/componentes/ui/estilos";
import type { Oferta } from "@/lib/oferta";
import { EscolhaDePlanos } from "./escolhaDePlanos";
import { CabecalhoDaSecao, ListaDeConferencia, conteiner } from "./secao";

const INCLUSO = [
  "Ordens de serviço sem limite",
  "Link de acompanhamento para o cliente, pelo celular",
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
          titulo="Três planos, com tudo incluso"
          descricao="Todos os planos têm todos os recursos: muda só o tamanho da assistência, em lojas e pessoas."
        />

        <EscolhaDePlanos oferta={oferta} />

        <div className="revelar mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-3xl border border-borda bg-superficie shadow-cartao lg:grid-cols-2">
          <div className="p-7 sm:p-10">
            <p className="text-sm font-semibold">Tudo isto já vem incluso, em qualquer plano</p>
            <div className="mt-5">
              <ListaDeConferencia itens={INCLUSO} />
            </div>
          </div>

          <div className="border-t border-borda p-7 sm:p-10 lg:border-t-0 lg:border-l">
            <p className="text-sm font-semibold">Sem cartão de crédito para testar</p>
            <ul className="mt-5 space-y-3.5">
              {CONDICOES.map(({ icone: Icone, texto }) => (
                <li key={texto} className="flex gap-3 text-sm leading-snug text-texto-suave">
                  <Icone size={18} className="shrink-0 text-icone" />
                  {texto}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
