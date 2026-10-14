import { ProgressoDoReparo } from "@/componentes/ProgressoDoReparo";
import { CameraIcon, FileTextIcon, LinkSimpleIcon, type Icon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { Ordem } from "@/lib/tipos";
import { linkDoWhatsApp } from "@/lib/whatsapp";
import { AcoesDeStatus } from "./acoesDeStatus";
import { AvisoNoWhatsApp } from "./avisoNoWhatsApp";
import { ItensDoOrcamento } from "./orcamentoDaOrdem";

type Passo = { titulo: string; texto: string; encerrado?: boolean };

const PASSOS: Record<string, Passo> = {
  recebido: {
    titulo: "Receber o aparelho",
    texto:
      "Com o cliente ainda no balcão, faça o que está abaixo. Depois, quando o técnico for examinar o aparelho, clique em Começar o diagnóstico.",
  },
  em_diagnostico: {
    titulo: "Montar o orçamento",
    texto:
      "Adicione as peças e os serviços, cada um com o seu valor. Depois clique em Enviar o orçamento ao cliente: ele vê o orçamento no link de acompanhamento e, se tiver e-mail, recebe um aviso.",
  },
  orcamento_enviado: {
    titulo: "Esperar a resposta do cliente",
    texto:
      "O cliente vê o orçamento no link de acompanhamento. Se ainda não mandou o link, mande pelo WhatsApp. Quando ele responder, marque aqui o que ele decidiu.",
  },
  aprovado: {
    titulo: "Começar o reparo",
    texto: "O cliente aprovou o orçamento. Quando começar o conserto, clique em Começar o reparo.",
  },
  reprovado: {
    titulo: "Devolver o aparelho",
    texto:
      "O cliente recusou o orçamento. Quando ele buscar o aparelho, clique em Registrar a devolução.",
  },
  em_reparo: {
    titulo: "Terminar o reparo",
    texto:
      "Quando o aparelho estiver consertado, clique em Reparo pronto: o cliente vê no link que pode buscar e, se tiver e-mail, recebe um aviso. Se faltar uma peça, clique em Aguardar uma peça.",
  },
  aguardando_peca: {
    titulo: "Esperar a peça chegar",
    texto: "O conserto está parado esperando uma peça. Quando ela chegar, volte ao reparo.",
  },
  pronto: {
    titulo: "Entregar ao cliente",
    texto:
      "Avise o cliente que o aparelho está pronto. Na hora da entrega, confira o valor cobrado e registre como ele pagou.",
  },
  entregue: {
    titulo: "Ordem encerrada",
    texto:
      "O aparelho foi entregue. Se o cliente pedir, imprima o recibo com a garantia no botão Recibo, no alto da tela.",
    encerrado: true,
  },
  devolvido_sem_reparo: {
    titulo: "Ordem encerrada",
    texto: "O aparelho foi devolvido ao cliente sem reparo.",
    encerrado: true,
  },
};

function passoDa(ordem: Ordem): Passo {
  const saldo = Number(ordem.saldo_a_receber);
  if (ordem.status === "entregue" && saldo > 0) {
    return {
      titulo: "Receber o que falta",
      texto: `O aparelho foi entregue, mas ainda falta receber ${emReais(ordem.saldo_a_receber)}. Quando o cliente pagar, registre no cartão Pagamento, logo abaixo.`,
    };
  }
  return PASSOS[ordem.status] ?? { titulo: ordem.status_label, texto: "" };
}

type Aviso = { rotulo: string; mensagem: string };

function avisoDa(ordem: Ordem, link: string): Aviso | null {
  const nome = ordem.cliente_nome.split(" ")[0];
  const aparelho = ordem.aparelho_descricao;

  switch (ordem.status) {
    case "recebido":
      return {
        rotulo: "Mandar no WhatsApp",
        mensagem: `Olá, ${nome}! Acompanhe o reparo do seu ${aparelho} por aqui: ${link}`,
      };
    case "orcamento_enviado":
      return {
        rotulo: "Mandar o orçamento no WhatsApp",
        mensagem: `Olá, ${nome}! O orçamento do seu ${aparelho} está pronto. Veja e responda por aqui: ${link}`,
      };
    case "pronto":
      return {
        rotulo: "Avisar o cliente no WhatsApp",
        mensagem: `Olá, ${nome}! Seu ${aparelho} está pronto para retirada. Veja os detalhes: ${link}`,
      };
    default:
      return null;
  }
}

function linkDoAviso(ordem: Ordem, mensagem: string): string {
  return (
    linkDoWhatsApp(ordem.cliente_telefone, mensagem) ??
    `https://wa.me/?text=${encodeURIComponent(mensagem)}`
  );
}

function TarefaDaEntrada({
  icone: Icone,
  titulo,
  detalhe,
  children,
}: {
  icone: Icon;
  titulo: string;
  detalhe?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <span className="flex min-w-0 items-start gap-3">
        <Icone size={20} className="mt-px shrink-0 text-icone" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{titulo}</span>
          {detalhe && <span className="block text-[13px] text-texto-apagado">{detalhe}</span>}
        </span>
      </span>
      <span className="max-sm:w-full max-sm:pl-8">{children}</span>
    </li>
  );
}

function TarefasDaEntrada({ ordem, aviso }: { ordem: Ordem; aviso: Aviso | null }) {
  const fotos = ordem.fotos.length;

  return (
    <ul className="divide-y divide-borda border-y border-borda">
      <TarefaDaEntrada
        icone={CameraIcon}
        titulo="Tire fotos do aparelho"
        detalhe={
          fotos > 0
            ? `${fotos} ${fotos === 1 ? "foto tirada" : "fotos tiradas"}.`
            : "Riscos e trincas fotografados evitam discussão na entrega."
        }
      >
        <a href="#fotos" className={juntar(botao("secundario", "sm"), "max-sm:w-full")}>
          <CameraIcon size={15} />
          {fotos > 0 ? "Ver as fotos" : "Tirar fotos"}
        </a>
      </TarefaDaEntrada>
      <TarefaDaEntrada
        icone={FileTextIcon}
        titulo="Imprima o comprovante"
        detalhe="O cliente assina e fica com uma via."
      >
        <a
          href={`/ordens/${ordem.id}/documentos/comprovante`}
          target="_blank"
          rel="noopener"
          className={juntar(botao("secundario", "sm"), "max-sm:w-full")}
        >
          <FileTextIcon size={15} />
          Imprimir
        </a>
      </TarefaDaEntrada>
      {aviso && (
        <TarefaDaEntrada
          icone={LinkSimpleIcon}
          titulo="Mande o link de acompanhamento"
          detalhe="Por ele o cliente vê o andamento sem precisar ligar."
        >
          <AvisoNoWhatsApp
            id={ordem.id}
            link={linkDoAviso(ordem, aviso.mensagem)}
            rotulo={aviso.rotulo}
            tamanho="sm"
          />
        </TarefaDaEntrada>
      )}
    </ul>
  );
}

export function ProximoPasso({ ordem, linkDoCliente }: { ordem: Ordem; linkDoCliente: string }) {
  const passo = passoDa(ordem);
  const aviso = avisoDa(ordem, linkDoCliente);
  const recebido = ordem.status === "recebido";
  const montandoOrcamento = ordem.status === "em_diagnostico";
  const temAcoes = ordem.transicoes_possiveis.length > 0;

  return (
    <section
      data-tour="proximo-passo"
      className="overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <ProgressoDoReparo status={ordem.status} />

        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-destaque">
            {passo.encerrado ? "Situação" : "Próximo passo"}
          </p>
          <h2 className="text-lg leading-snug font-bold">{passo.titulo}</h2>
          {passo.texto && (
            <p className="text-sm leading-relaxed text-pretty text-texto-suave">{passo.texto}</p>
          )}
        </div>

        {recebido && <TarefasDaEntrada ordem={ordem} aviso={aviso} />}

        {aviso && !recebido && (
          <AvisoNoWhatsApp
            id={ordem.id}
            link={linkDoAviso(ordem, aviso.mensagem)}
            rotulo={aviso.rotulo}
          />
        )}
      </div>

      {montandoOrcamento && (
        <div data-tour="orcamento" className="border-t border-borda">
          <ItensDoOrcamento ordem={ordem} />
        </div>
      )}

      {temAcoes && (
        <div data-tour="mudar-status" className="border-t border-borda p-5 sm:px-6">
          <AcoesDeStatus
            id={ordem.id}
            status={ordem.status}
            transicoes={ordem.transicoes_possiveis}
            itens={ordem.itens}
            totalAprovado={ordem.total_aprovado}
          />
        </div>
      )}
    </section>
  );
}
