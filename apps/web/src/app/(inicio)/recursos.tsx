import Link from "next/link";
import {
  ArrowRightIcon,
  CameraIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  LockSimpleIcon,
  PasswordIcon,
  QrCodeIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  TimerIcon,
  UserCheckIcon,
  type Icon,
} from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { TelaDoCelular, TelaDoComputador } from "./molduras";
import { CabecalhoDaSecao, ListaDeConferencia, conteiner } from "./secao";
import telaDoOrcamento from "./telas/acompanhamento-orcamento-enviado.png";
import telaDasContas from "./telas/contas-a-pagar.png";
import telaDoEstoque from "./telas/estoque.png";

type Detalhe = { icone: Icon; texto: string };

const FOTOS: Detalhe[] = [
  { icone: FileTextIcon, texto: "Comprovante de entrada em PDF, pronto para imprimir" },
  { icone: QrCodeIcon, texto: "QR Code no papel que abre o acompanhamento" },
  { icone: ReceiptIcon, texto: "Recibo de entrega com a garantia, enviado por e-mail" },
  { icone: ShieldCheckIcon, texto: "Fotos guardadas sem endereço público e sem a localização da câmera" },
];

const SENHA: Detalhe[] = [
  { icone: LockSimpleIcon, texto: "Guardada com criptografia" },
  { icone: UserCheckIcon, texto: "Só o técnico e o dono veem; o atendente, não" },
  { icone: ClockCounterClockwiseIcon, texto: "Cada consulta fica registrada, com nome e horário" },
  { icone: TimerIcon, texto: "Apagada sozinha sete dias depois da entrega" },
];

function Destaque({
  sobretitulo,
  titulo,
  texto,
  itens,
  imagem,
  acao,
  invertido = false,
}: {
  sobretitulo: string;
  titulo: string;
  texto: string;
  itens: string[];
  imagem: React.ReactNode;
  acao?: React.ReactNode;
  invertido?: boolean;
}) {
  return (
    <div
      className={juntar(
        "revelar grid items-center gap-12 lg:gap-16",
        invertido
          ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
          : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
      )}
    >
      <div className={juntar("max-w-xl", invertido && "lg:order-last")}>
        <p className="text-sm font-semibold text-destaque">{sobretitulo}</p>
        <h3 className="mt-3 text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
          {titulo}
        </h3>
        <p className="mt-4 text-[17px] leading-relaxed text-pretty text-texto-suave">{texto}</p>
        <div className="mt-7">
          <ListaDeConferencia itens={itens} />
        </div>
        {acao && <div className="mt-8">{acao}</div>}
      </div>
      {imagem}
    </div>
  );
}

function CartaoDeRecurso({
  icone: Icone,
  sobretitulo,
  titulo,
  texto,
  detalhes,
}: {
  icone: Icon;
  sobretitulo: string;
  titulo: string;
  texto: string;
  detalhes: Detalhe[];
}) {
  return (
    <article className="revelar flex flex-col rounded-3xl border border-borda bg-superficie p-7 shadow-cartao sm:p-9">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-destaque">
        <Icone size={20} className="text-icone" />
        {sobretitulo}
      </div>
      <h3 className="mt-4 text-2xl leading-tight font-bold tracking-tight text-balance">{titulo}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-pretty text-texto-suave">{texto}</p>
      <ul className="mt-7 space-y-4 border-t border-borda pt-6">
        {detalhes.map(({ icone: IconeDoDetalhe, texto: detalhe }) => (
          <li key={detalhe} className="flex gap-3 text-[15px] leading-snug">
            <IconeDoDetalhe size={20} className="shrink-0 text-icone" />
            {detalhe}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Recursos() {
  return (
    <section id="recursos" className="scroll-mt-16 border-t border-borda bg-fundo">
      <div className={juntar(conteiner, "py-20 sm:py-28")}>
        <CabecalhoDaSecao
          sobretitulo="Recursos"
          titulo="Tudo o que acontece no balcão, num lugar só"
          descricao="Cada parte do Bancada resolve uma dor de quem conserta celular todo dia."
        />

        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-28">
          <Destaque
            sobretitulo="Acompanhamento pelo celular"
            titulo="Chega de “e aí, já ficou pronto?”"
            texto="Cada ordem gera um link que você manda pelo WhatsApp com um toque. O cliente abre no celular e vê em que etapa está o conserto, sem baixar aplicativo nem criar conta."
            itens={[
              "Etapas do conserto, previsão de entrega e orçamento com os valores",
              "Com o nome e a logo da sua loja",
              "Aviso por e-mail quando o orçamento sai, quando fica pronto e na entrega",
              "Botões para o cliente ligar ou chamar a loja no WhatsApp",
            ]}
            acao={
              <Link href="/demonstracao" className={botao("secundario")}>
                Ver a demonstração
                <ArrowRightIcon size={16} />
              </Link>
            }
            imagem={
              <div className="flex justify-center overflow-hidden rounded-3xl border border-borda bg-superficie px-6 pt-10 shadow-cartao sm:pt-12">
                <TelaDoCelular
                  imagem={telaDoOrcamento}
                  descricao="Página do cliente com o orçamento enviado, os itens com os valores e o pedido de aprovação"
                  tamanhos="240px"
                  elevado={false}
                  className="-mb-28 w-64 sm:-mb-24"
                />
              </div>
            }
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <CartaoDeRecurso
              icone={CameraIcon}
              sobretitulo="Fotos e comprovante"
              titulo="Fotos na entrada encerram a discussão do arranhão"
              texto="Fotografe o aparelho no balcão. As fotos saem no comprovante que o cliente assina, junto com o defeito relatado."
              detalhes={FOTOS}
            />
            <CartaoDeRecurso
              icone={PasswordIcon}
              sobretitulo="Senha de desbloqueio"
              titulo="A senha do cliente longe do papel"
              texto="Anotar a senha num papel preso ao aparelho expõe o cliente. No Bancada, ela fica protegida do começo ao fim."
              detalhes={SENHA}
            />
          </div>

          <Destaque
            invertido
            sobretitulo="Estoque e vendas no balcão"
            titulo="Você sabe o que tem na prateleira e o que falta comprar"
            texto="Cadastre peças e acessórios com o custo e o preço de venda. A peça do orçamento sai do estoque quando o cliente aprova, e a venda no balcão tira os acessórios na hora."
            itens={[
              "Quantidade em cada loja e aviso do que precisa repor",
              "Venda no balcão com desconto e pagamento dividido",
              "Custo médio das compras e lucro de cada conserto e de cada venda",
              "Busca pelo nome ou pelo código de barras",
            ]}
            imagem={
              <TelaDoComputador
                imagem={telaDoEstoque}
                descricao="Estoque do Bancada, com o aviso dos produtos para repor e, em cada peça, a quantidade em cada loja, o custo e o preço"
                tamanhos="(min-width: 1024px) 496px, 78vw"
              />
            }
          />

          <Destaque
            sobretitulo="Financeiro"
            titulo="Você sabe quanto entrou, quanto saiu e quanto sobrou"
            texto="Na entrega, registre quanto o cliente pagou e como: PIX, dinheiro, débito ou crédito, dividido como precisar. Lance as contas da loja, confira a gaveta no fim do dia e veja no painel o lucro de cada mês."
            itens={[
              "Saldo a receber de cada cliente, com o dia combinado",
              "Contas a pagar, com as que se repetem todo mês",
              "Conferência da gaveta no fim do dia, em cada loja",
              "Painel com as ordens atrasadas, o ticket médio e quanto cada técnico entregou",
            ]}
            imagem={
              <TelaDoComputador
                imagem={telaDasContas}
                descricao="Contas a pagar do Bancada, com o total vencido, o que vence nos próximos 7 dias, o que foi pago no mês e a lista das contas"
                tamanhos="(min-width: 1024px) 496px, 78vw"
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
