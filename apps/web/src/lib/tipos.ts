export type Tenant = { id: number; nome: string; slug: string };

export type Usuario = {
  id: number;
  username: string;
  first_name: string;
  email: string;
  email_confirmado: boolean;
  papel: string;
  tenant: Tenant | null;
};

export type SituacaoDaAssinatura = "teste" | "ativa" | "inadimplente" | "suspensa" | "cancelada";

export type ResumoDaAssinatura = {
  situacao: SituacaoDaAssinatura;
  situacao_rotulo: string;
  pode_editar: boolean;
  contratada: boolean;
  em_teste: boolean;
  teste_termina_em: string;
  dias_de_teste: number;
  pagar_ate: string | null;
  acesso_ate: string | null;
};

export type UsuarioAtual = Usuario & {
  tours_vistos: string[];
  primeiros_passos_escondidos: boolean;
  assinatura: ResumoDaAssinatura | null;
};

export type Sessao = { token: string; usuario: Usuario };

export type Convite = {
  id: number;
  nome: string;
  papel: string;
  papel_rotulo: string;
  email: string;
  link: string;
  expira_em: string;
  expirado: boolean;
  criado_em: string;
};

export type ConvitePublico = {
  assistencia: string;
  nome: string;
  email: string;
  papel: string;
  papel_rotulo: string;
  expira_em: string;
};

export type Assistencia = { nome: string; documento: string; whatsapp: string };

export type MembroDaEquipe = {
  id: number;
  username: string;
  first_name: string;
  email: string;
  papel: string;
  papel_rotulo: string;
  is_active: boolean;
  last_login: string | null;
};

export type Loja = { id: number; nome: string; telefone: string; endereco: string };

export type Aparelho = {
  id: number;
  cliente: number;
  descricao: string;
  marca: string;
  modelo: string;
  cor: string;
  imei: string;
  imei_mascarado: string;
};

export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  aparelhos: Aparelho[];
};

export type AvisoAoCliente = { destino: string; enviado_em: string };

export type Evento = {
  id: number;
  de_status: string;
  de_label: string;
  para_status: string;
  para_label: string;
  usuario: string | null;
  nota: string;
  aviso: AvisoAoCliente | null;
  criado_em: string;
};

export type ItemOrcamento = {
  id: number;
  tipo: string;
  descricao: string;
  valor: string;
  aprovado: boolean;
};

export type Pagamento = {
  id: number;
  forma: string;
  forma_rotulo: string;
  valor: string;
  recebido_em: string;
  registrado_por: string | null;
};

export type Foto = {
  id: number;
  momento: string;
  momento_label: string;
  legenda: string;
  largura: number;
  altura: number;
  visivel_ao_cliente: boolean;
  assinatura: string;
  criado_em: string;
};

export type Opcao = { valor: string; rotulo: string };

export type Catalogo = { status: Opcao[]; ordenacoes: Opcao[] };

export type Transicao = Opcao;

export type OrdemResumo = {
  id: number;
  numero: number;
  status: string;
  status_label: string;
  cliente_nome: string;
  aparelho_descricao: string;
  tecnico_nome: string | null;
  problema_relatado: string;
  token_publico: string;
  criado_em: string;
};

export type Ordem = OrdemResumo & {
  aparelho: number;
  tecnico: number | null;
  diagnostico: string;
  laudo: string;
  prometida_para: string | null;
  garantia_ate: string | null;
  entregue_em: string | null;
  imei_mascarado: string;
  itens: ItemOrcamento[];
  eventos: Evento[];
  fotos: Foto[];
  transicoes_possiveis: Transicao[];
  total_orcamento: string;
  total_aprovado: string;
  orcamento_editavel: boolean;
  orcamento_aprovado: boolean;
  valor_cobrado: string | null;
  desconto: string;
  pagamentos: Pagamento[];
  total_pago: string;
  saldo_a_receber: string;
};

export type LinhaDeStatus = { status: string; rotulo: string; total: number };

export type Comparacao<T> = { atual: T; anterior: T };

export type Intervalo = { inicio: string; fim: string };

export type PeriodoDoPainel = Intervalo & { chave: string; anterior: Intervalo };

export type EtapaMedida = { status: string; rotulo: string; horas: number; vezes: number };

export type ValorPorForma = { forma: string; rotulo: string; valor: string };

export type LinhaDaEquipe = {
  tecnico: number | null;
  nome: string;
  concluidas: number;
  recebido: string;
};

export type Painel = {
  periodo: PeriodoDoPainel;
  agora: {
    abertas: number;
    atrasadas: number;
    aguardando_cliente: number;
    aguardando_peca: number;
    prontas: number;
    por_status: LinhaDeStatus[];
  };
  operacao: {
    abertas: Comparacao<number>;
    entregues: Comparacao<number>;
    dias_medios_de_reparo: Comparacao<number | null>;
    tempo_por_etapa: EtapaMedida[];
  };
  atendimento: {
    aparelhos: { marca: string; modelo: string; total: number }[];
    defeitos: { defeito: string; total: number }[];
    clientes: {
      atendidos: number;
      que_voltaram: number;
      mais_frequentes: { nome: string; telefone: string; ordens: number }[];
    };
  };
  dinheiro?: {
    recebido: Comparacao<string>;
    por_forma: ValorPorForma[];
    descontos: Comparacao<string>;
    ticket_medio: Comparacao<string | null>;
    taxa_de_aprovacao: Comparacao<number | null>;
    a_receber: { valor: string; ordens: number };
    aprovado_em_aberto: string;
  };
  equipe?: LinhaDaEquipe[];
};

export type Pagina<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type Passo = { chave: string; feito: boolean };

export type PrimeirosPassos = {
  escondidos: boolean;
  passos: Passo[];
  ordem_mais_recente: number | null;
};

export type Fatura = {
  id: number;
  valor: string;
  vencimento: string;
  situacao: "aberta" | "paga" | "vencida" | "estornada" | "cancelada";
  situacao_rotulo: string;
  forma_de_pagamento: string;
  forma_rotulo: string;
  paga_em: string | null;
  link_de_pagamento: string;
};

export type DetalheDaAssinatura = ResumoDaAssinatura & {
  valor_mensal: string;
  primeiro_vencimento: string;
  documento_do_pagador: string;
  assinada_em: string | null;
  faturas: Fatura[];
};
