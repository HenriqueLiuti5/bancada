import {
  dataCurta,
  diaEMes,
  diaEMesEmNumeros,
  diaNoFuso,
  diaPorExtenso,
  diasEntre,
} from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { ContaAReceber, Opcao, Ordem, ResumoDasContas, TotalAReceber } from "@/lib/tipos";

// As mesmas categorias e formas de CategoriaDaConta e FormaDePagamentoDaConta, na API. Um teste de
// contrato confere que as duas listas combinam.
export const CATEGORIAS_DAS_CONTAS: Opcao[] = [
  { valor: "aluguel", rotulo: "Aluguel e condomínio" },
  { valor: "contas_da_loja", rotulo: "Luz, água, internet e telefone" },
  { valor: "salarios", rotulo: "Salários e pró-labore" },
  { valor: "impostos", rotulo: "Impostos, taxas e encargos" },
  { valor: "compras", rotulo: "Compras de peças e acessórios" },
  { valor: "ferramentas", rotulo: "Ferramentas e equipamentos" },
  { valor: "sistemas", rotulo: "Sistemas e assinaturas" },
  { valor: "propaganda", rotulo: "Propaganda" },
  { valor: "servicos", rotulo: "Contador e outros serviços" },
  { valor: "tarifas", rotulo: "Tarifas do banco e da maquininha" },
  { valor: "transporte", rotulo: "Transporte e entregas" },
  { valor: "manutencao", rotulo: "Manutenção e limpeza" },
  { valor: "outras", rotulo: "Outras despesas" },
];

export const FORMAS_DE_PAGAMENTO_DAS_CONTAS: Opcao[] = [
  { valor: "pix", rotulo: "PIX" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
  { valor: "boleto", rotulo: "Boleto" },
];

export type TomDoVencimento = "vencida" | "hoje" | "futura" | "paga" | "sem_data";

export type SituacaoDoVencimento = { tom: TomDoVencimento; curto: string; frase: string };

function situacaoDoPrazo(vencimento: string, hoje: string): SituacaoDoVencimento {
  const dias = diasEntre(hoje, vencimento);
  if (dias === -1) return { tom: "vencida", curto: "Ontem", frase: "Venceu ontem" };
  if (dias < -1) {
    return { tom: "vencida", curto: `Há ${-dias} dias`, frase: `Venceu há ${-dias} dias` };
  }
  if (dias === 0) return { tom: "hoje", curto: "Hoje", frase: "Vence hoje" };
  if (dias === 1) return { tom: "futura", curto: "Amanhã", frase: "Vence amanhã" };
  const data = diaEMes(vencimento);
  return { tom: "futura", curto: data, frase: `Vence em ${data}` };
}

export function situacaoDoVencimento(
  conta: { vencimento: string; paga_em: string | null },
  hoje: string,
): SituacaoDoVencimento {
  if (conta.paga_em) {
    return {
      tom: "paga",
      curto: `Paga ${diaEMesEmNumeros(conta.paga_em)}`,
      frase: `Paga em ${dataCurta(conta.paga_em)}`,
    };
  }
  return situacaoDoPrazo(conta.vencimento, hoje);
}

// O que o cliente ficou devendo vence no dia combinado, como uma conta a pagar. A ordem quitada
// mostra o dia em que o cliente terminou de pagar, e a entregue antes de existir a data combinada
// fica sem data.
export function situacaoDoAReceber(
  conta: Pick<ContaAReceber, "pagamento_combinado_para" | "quitada_em">,
  hoje: string,
  fuso: string,
): SituacaoDoVencimento {
  if (conta.quitada_em) {
    const dia = diaNoFuso(conta.quitada_em, fuso);
    return {
      tom: "paga",
      curto: `Recebido ${diaEMesEmNumeros(dia)}`,
      frase: `Recebido em ${dataCurta(dia)}`,
    };
  }
  if (!conta.pagamento_combinado_para) {
    return { tom: "sem_data", curto: "Sem data", frase: "Sem data combinada" };
  }
  return situacaoDoPrazo(conta.pagamento_combinado_para, hoje);
}

export type TextoDoAReceber = { texto: string; vencido: boolean };

// O que o cartão da ordem entregue diz enquanto o cliente deve uma parte.
export function textoDoAReceber(combinado: string | null, hoje: string): TextoDoAReceber {
  if (!combinado) {
    return {
      texto:
        "O aparelho foi entregue. Combine com o cliente quando ele vai pagar o resto e registre aqui quando ele pagar.",
      vencido: false,
    };
  }

  const dias = diasEntre(hoje, combinado);
  const dia = diaPorExtenso(combinado);
  if (dias < 0) {
    const quando = dias === -1 ? "ontem" : `há ${-dias} dias`;
    return {
      texto: `O pagamento combinado para ${dia} venceu ${quando}. Cobre o cliente e registre aqui quando ele pagar.`,
      vencido: true,
    };
  }

  const ate = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `até ${dia}`;
  return {
    texto: `O aparelho foi entregue e o cliente combinou pagar o resto ${ate}. Quando ele pagar, registre aqui.`,
    vencido: false,
  };
}

type OrdemQueDeve = Pick<
  Ordem,
  "cliente_nome" | "aparelho_descricao" | "saldo_a_receber" | "pagamento_combinado_para"
>;

export function mensagemDeCobranca(ordem: OrdemQueDeve): string {
  const nome = ordem.cliente_nome.split(" ")[0];
  const combinado = ordem.pagamento_combinado_para
    ? `, combinado para ${diaEMesEmNumeros(ordem.pagamento_combinado_para)}`
    : "";
  return `Olá, ${nome}! Passando para lembrar do pagamento de ${emReais(ordem.saldo_a_receber)} do conserto do seu ${ordem.aparelho_descricao}${combinado}. Qualquer dúvida, é só responder esta mensagem.`;
}

type AvisoDoPainel = Pick<ResumoDasContas, "vencidas" | "proximos_dias">;

// O painel soma o que já venceu com o que vence nos próximos 7 dias: é o que o dono precisa ter
// separado para pagar agora.
export function totalAPagarLogo(aviso: AvisoDoPainel): number {
  const centavos = (valor: string) => Math.round(Number(valor) * 100);
  return (centavos(aviso.vencidas.valor) + centavos(aviso.proximos_dias.valor)) / 100;
}

export function notaDoAPagar(aviso: AvisoDoPainel): string {
  const vencidas = aviso.vencidas.contas;
  const proximas = aviso.proximos_dias.contas;
  if (vencidas > 0 && proximas > 0) {
    return `${contagem(vencidas, "vencida", "vencidas")} e ${proximas} nos próximos 7 dias`;
  }
  if (vencidas > 0) return contagem(vencidas, "conta vencida", "contas vencidas");
  if (proximas > 0) return `${contagem(proximas, "conta", "contas")} nos próximos 7 dias`;
  return "nada vence nos próximos 7 dias";
}

type AReceberDoPainel = TotalAReceber & { vencidas: TotalAReceber };

export function notaDoAReceber(aReceber: AReceberDoPainel): string {
  const vencidas = aReceber.vencidas.ordens;
  if (vencidas > 0) {
    return contagem(vencidas, "ordem com o pagamento vencido", "ordens com o pagamento vencido");
  }
  return `${contagem(aReceber.ordens, "ordem entregue", "ordens entregues")} sem pagamento completo`;
}

export function linkDoAReceber(aReceber: AReceberDoPainel): string | undefined {
  if (aReceber.vencidas.ordens > 0) return "/financeiro/a-receber?situacao=vencidas";
  return aReceber.ordens > 0 ? "/financeiro/a-receber" : undefined;
}
