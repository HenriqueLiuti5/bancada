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
import telaDoPainel from "./telas/painel-dinheiro.png";

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
    <div className="revelar grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
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
            sobretitulo="Dinheiro e painel"
            titulo="Você sabe quanto entrou e quem ainda deve"
            texto="Na entrega, registre quanto o cliente pagou e como: PIX, dinheiro, débito ou crédito, dividido como precisar. O painel junta tudo no período que você escolher."
            itens={[
              "Desconto e saldo a receber em cada ordem",
              "Entradas por forma de pagamento e ticket médio",
              "Aprovação dos orçamentos e quanto cada técnico entregou",
              "Ordens atrasadas e tempo parado em cada etapa",
            ]}
            imagem={
              <TelaDoComputador
                imagem={telaDoPainel}
                descricao="Painel do Bancada com o dinheiro recebido no período, as entradas por forma de pagamento, o valor a receber e o ticket médio"
                tamanhos="(min-width: 1024px) 424px, 78vw"
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
