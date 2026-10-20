import { FUSO_HORARIO, hojeEmIso, somarDias } from "@/lib/datas";
import type { AcompanhamentoPublico } from "@/lib/publico";

export const ETAPAS_DA_DEMONSTRACAO = [
  { valor: "recebido", rotulo: "Recebido" },
  { valor: "orcamento_enviado", rotulo: "Orçamento" },
  { valor: "em_reparo", rotulo: "Reparo" },
  { valor: "pronto", rotulo: "Pronto" },
  { valor: "entregue", rotulo: "Entregue" },
] as const;

export type EtapaDaDemonstracao = (typeof ETAPAS_DA_DEMONSTRACAO)[number]["valor"];

const ETAPA_INICIAL: EtapaDaDemonstracao = "em_reparo";

const UMA_HORA = 60 * 60 * 1000;
const MEIA_HORA = UMA_HORA / 2;

const CAMINHO = [
  {
    status: "recebido",
    rotulo: "Recebido",
    mensagem: "Recebemos seu aparelho e ele entrou na fila.",
    horas: 0,
  },
  {
    status: "em_diagnostico",
    rotulo: "Em diagnóstico",
    mensagem: "Estamos avaliando o aparelho para identificar o problema.",
    horas: 1,
  },
  {
    status: "orcamento_enviado",
    rotulo: "Orçamento enviado",
    mensagem: "O orçamento está pronto e aguarda sua aprovação.",
    horas: 4,
  },
  {
    status: "aprovado",
    rotulo: "Aprovado",
    mensagem: "Orçamento aprovado. O reparo entrou na fila.",
    horas: 20,
  },
  {
    status: "em_reparo",
    rotulo: "Em reparo",
    mensagem: "Seu aparelho está sendo reparado.",
    horas: 24,
  },
  {
    status: "pronto",
    rotulo: "Pronto",
    mensagem: "Seu aparelho está pronto para retirada.",
    horas: 46,
  },
  {
    status: "entregue",
    rotulo: "Entregue",
    mensagem: "Aparelho entregue. Obrigado pela confiança.",
    horas: 50,
  },
];

const ITENS = [
  { descricao: "Tela com moldura Galaxy A54", valor: "480.00" },
  { descricao: "Mão de obra", valor: "90.00" },
];

const TOTAL = "570.00";

export function etapaDaDemonstracao(valor: unknown): EtapaDaDemonstracao {
  const etapa = ETAPAS_DA_DEMONSTRACAO.find((opcao) => opcao.valor === valor);
  return etapa ? etapa.valor : ETAPA_INICIAL;
}

export function acompanhamentoDeExemplo(etapa: EtapaDaDemonstracao): AcompanhamentoPublico {
  const posicao = CAMINHO.findIndex((passo) => passo.status === etapa);
  const percorrido = CAMINHO.slice(0, posicao + 1);
  const atual = percorrido[posicao];
  const abertura = Date.now() - atual.horas * UMA_HORA - MEIA_HORA;
  const momento = (horas: number) => new Date(abertura + horas * UMA_HORA).toISOString();
  const mostraOrcamento = posicao >= CAMINHO.findIndex((passo) => passo.status === "orcamento_enviado");

  return {
    numero: 1042,
    status: atual.status,
    status_rotulo: atual.rotulo,
    mensagem: atual.mensagem,
    encerrada: etapa === "entregue",
    aparelho: "Samsung Galaxy A54",
    cliente_primeiro_nome: "Ana",
    assistencia: {
      nome: "Sua Assistência",
      loja: "",
      telefone: "11999999999",
      logo: null,
      fuso_horario: FUSO_HORARIO,
    },
    aberta_em: momento(0),
    prometida_para: somarDias(hojeEmIso(), 2),
    entregue_em: etapa === "entregue" ? momento(atual.horas) : null,
    linha_do_tempo: percorrido.map((passo) => ({
      status: passo.status,
      rotulo: passo.rotulo,
      em: momento(passo.horas),
    })),
    fotos: [],
    orcamento: mostraOrcamento
      ? { aprovado: etapa !== "orcamento_enviado", total: TOTAL, itens: ITENS }
      : undefined,
  };
}
