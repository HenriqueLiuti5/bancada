import { dataCurta, diaEMes, diaEMesEmNumeros, diasEntre } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import type { Opcao, ResumoDasContas } from "@/lib/tipos";

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

export type TomDoVencimento = "vencida" | "hoje" | "futura" | "paga";

export type SituacaoDoVencimento = { tom: TomDoVencimento; curto: string; frase: string };

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

  const dias = diasEntre(hoje, conta.vencimento);
  if (dias === -1) return { tom: "vencida", curto: "Ontem", frase: "Venceu ontem" };
  if (dias < -1) {
    return { tom: "vencida", curto: `Há ${-dias} dias`, frase: `Venceu há ${-dias} dias` };
  }
  if (dias === 0) return { tom: "hoje", curto: "Hoje", frase: "Vence hoje" };
  if (dias === 1) return { tom: "futura", curto: "Amanhã", frase: "Vence amanhã" };
  const data = diaEMes(conta.vencimento);
  return { tom: "futura", curto: data, frase: `Vence em ${data}` };
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
