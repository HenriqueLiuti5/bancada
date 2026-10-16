import { CameraIcon, FileTextIcon, ReceiptIcon } from "@/componentes/icones";
import { botao, juntar } from "@/componentes/ui/estilos";
import { emReais } from "@/lib/moeda";
import type { Ordem } from "@/lib/tipos";
import { linkDoWhatsApp } from "@/lib/whatsapp";
import { AcoesDaEtapa } from "./acoesDaEtapa";
import { AvisoNoWhatsApp } from "./avisoNoWhatsApp";
import { BarraDeEtapas } from "./barraDeEtapas";

type Etapa = { titulo: React.ReactNode; texto: string };

const ETAPAS: Record<string, Etapa> = {
  recebido: {
    titulo: "Aparelho recebido",
    texto:
      "Com o cliente ainda no balcão, tire as fotos, imprima o comprovante e mande o link de acompanhamento.",
  },
  em_diagnostico: {
    titulo: "Montar o orçamento",
    texto:
      "Adicione as peças e os serviços na aba Orçamento e envie ao cliente. Ele vê pelo link e, se tiver e-mail, recebe um aviso.",
  },
  orcamento_enviado: {
    titulo: "Esperando a resposta do cliente",
    texto: "Ele vê o orçamento pelo link. Quando responder, marque aqui o que ele decidiu.",
  },
  aprovado: {
    titulo: "Orçamento aprovado",
    texto: "Quando o técnico começar o conserto, clique em Começar o reparo.",
  },
  reprovado: {
    titulo: "Orçamento recusado",
    texto: "Quando o cliente buscar o aparelho, registre a devolução.",
  },
  em_reparo: {
    titulo: "Em reparo",
    texto:
      "Quando terminar, clique em Reparo pronto e o cliente é avisado. Se faltar uma peça, pause o reparo.",
  },
  aguardando_peca: {
    titulo: "Esperando uma peça",
    texto: "O conserto está parado. Quando a peça chegar, volte ao reparo.",
  },
  pronto: {
    titulo: "Pronto para retirada",
    texto: "Avise o cliente. Na entrega, confira o valor e registre como ele pagou.",
  },
  entregue: {
    titulo: "Entregue",
    texto: "Ordem encerrada. O recibo com a garantia fica no botão Recibo, no alto da tela.",
  },
  devolvido_sem_reparo: {
    titulo: "Devolvido sem reparo",
    texto: "Ordem encerrada. O aparelho voltou ao cliente sem conserto.",
  },
};

function etapaDa(ordem: Ordem): Etapa {
  if (ordem.status === "entregue" && Number(ordem.saldo_a_receber) > 0) {
    return {
      titulo: (
        <>
          Falta receber <span className="text-dinheiro">{emReais(ordem.saldo_a_receber)}</span>
        </>
      ),
      texto: "O aparelho foi entregue. Quando o cliente pagar o resto, registre aqui.",
    };
  }
  return ETAPAS[ordem.status] ?? { titulo: ordem.status_label, texto: "" };
}

type Aviso = { rotulo: string; mensagem: string };

function avisoDa(ordem: Ordem, link: string): Aviso | null {
  const nome = ordem.cliente_nome.split(" ")[0];
  const aparelho = ordem.aparelho_descricao;

  switch (ordem.status) {
    case "recebido":
      return {
        rotulo: "Mandar o link no WhatsApp",
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

function atalhosDa(ordem: Ordem, linkDoCliente: string): React.ReactNode {
  const aviso = avisoDa(ordem, linkDoCliente);
  const whatsapp = aviso && (
    <AvisoNoWhatsApp
      id={ordem.id}
      link={
        linkDoWhatsApp(ordem.cliente_telefone, aviso.mensagem) ??
        `https://wa.me/?text=${encodeURIComponent(aviso.mensagem)}`
      }
      rotulo={aviso.rotulo}
    />
  );

  if (ordem.status === "recebido") {
    const fotos = ordem.fotos.length;
    return (
      <>
        <a href="#fotos" className={juntar(botao("secundario"), "max-sm:w-full")}>
          <CameraIcon size={17} />
          {fotos > 0 ? `Fotos (${fotos})` : "Tirar fotos"}
        </a>
        <a
          href={`/ordens/${ordem.id}/documentos/comprovante`}
          target="_blank"
          rel="noopener"
          className={juntar(botao("secundario"), "max-sm:w-full")}
        >
          <FileTextIcon size={17} />
          Imprimir comprovante
        </a>
        {whatsapp}
      </>
    );
  }

  if (ordem.status === "em_diagnostico") {
    return (
      <a href="#orcamento" className={juntar(botao("secundario"), "max-sm:w-full lg:hidden")}>
        <ReceiptIcon size={17} />
        Abrir o orçamento
      </a>
    );
  }

  return whatsapp;
}

export function PainelDaEtapa({
  ordem,
  linkDoCliente,
  className,
}: {
  ordem: Ordem;
  linkDoCliente: string;
  className?: string;
}) {
  const etapa = etapaDa(ordem);

  return (
    <section
      data-tour="acoes"
      className={juntar(
        "rounded-2xl border border-borda bg-superficie p-5 shadow-cartao sm:p-6",
        className,
      )}
    >
      <BarraDeEtapas status={ordem.status} />

      <div className="mt-5 space-y-1">
        <h2 className="text-lg leading-snug font-bold">{etapa.titulo}</h2>
        {etapa.texto && (
          <p className="text-sm leading-relaxed text-pretty text-texto-suave">{etapa.texto}</p>
        )}
      </div>

      <AcoesDaEtapa
        key={`${ordem.status}:${ordem.saldo_a_receber}`}
        id={ordem.id}
        status={ordem.status}
        transicoes={ordem.transicoes_possiveis}
        itens={ordem.itens}
        totalAprovado={ordem.total_aprovado}
        saldoAReceber={ordem.saldo_a_receber}
        atalhos={atalhosDa(ordem, linkDoCliente)}
      />
    </section>
  );
}
