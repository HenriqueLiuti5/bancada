export type Tenant = { id: number; nome: string; slug: string; fuso_horario: string };

export type Usuario = {
  id: number;
  username: string;
  first_name: string;
  email: string;
  email_confirmado: boolean;
  papel: string;
  tenant: Tenant | null;
  da_plataforma: boolean;
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

export type Logo = { assinatura: string; largura: number; altura: number };

export type Assistencia = {
  nome: string;
  documento: string;
  whatsapp: string;
  fuso_horario: string;
  logo: Logo | null;
};

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

export type Loja = { id: number; nome: string; telefone: string; endereco: string; ativa: boolean };

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

export type RegistroDaOrdem = {
  id: number;
  tipo: "comentario" | "troca_de_cliente" | "pagamento_combinado";
  usuario: string | null;
  texto: string;
  criado_em: string;
};

export type ItemOrcamento = {
  id: number;
  tipo: string;
  descricao: string;
  valor: string;
  aprovado: boolean;
  produto: number | null;
  custo: string | null;
  custo_do_item: string | null;
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
  encerrada: boolean;
  cliente_nome: string;
  aparelho_descricao: string;
  tecnico_nome: string | null;
  problema_relatado: string;
  prometida_para: string | null;
  token_publico: string;
  criado_em: string;
};

export type Ordem = OrdemResumo & {
  loja: number;
  loja_nome: string;
  cliente: number;
  cliente_telefone: string;
  aparelho: number;
  tecnico: number | null;
  diagnostico: string;
  laudo: string;
  garantia_ate: string | null;
  entregue_em: string | null;
  imei_mascarado: string;
  aparelho_em_outras_ordens: boolean;
  itens: ItemOrcamento[];
  eventos: Evento[];
  registros: RegistroDaOrdem[];
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
  pagamento_combinado_para: string | null;
  custo_dos_itens: string;
  lucro: string;
  pecas_sem_custo: number;
};

export type QuantidadeNaLoja = { loja: number; nome: string; ativa: boolean; quantidade: number };

export type Produto = {
  id: number;
  nome: string;
  tipo: "peca" | "acessorio";
  tipo_rotulo: string;
  codigo: string;
  custo: string;
  preco: string;
  minimo: number;
  ativo: boolean;
  quantidade: number;
  para_repor: boolean;
  por_loja: QuantidadeNaLoja[];
};

export type MovimentoDeEstoque = {
  id: number;
  tipo: string;
  tipo_rotulo: string;
  quantidade: number;
  loja: number;
  loja_nome: string;
  custo_unitario: string | null;
  fornecedor: string;
  observacao: string;
  ordem: number | null;
  ordem_numero: number | null;
  venda: number | null;
  venda_numero: number | null;
  usuario: string | null;
  criado_em: string;
};

export type ProdutoParaEscolher = {
  id: number;
  nome: string;
  tipo: "peca" | "acessorio";
  codigo: string;
  custo: string;
  preco: string;
  quantidade: number;
  por_loja: Record<string, number>;
};

export type EscolhaDeProdutos = { varias_lojas: boolean; produtos: ProdutoParaEscolher[] };

export type VendaResumo = {
  id: number;
  numero: number;
  loja: number;
  loja_nome: string;
  vendida_por: string | null;
  valor_cobrado: string;
  resumo: string;
  formas: string;
  desfeita: boolean;
  criado_em: string;
};

export type ItemDaVenda = {
  id: number;
  produto: number;
  descricao: string;
  quantidade: number;
  preco: string;
  custo: string;
  subtotal: string;
};

export type Venda = VendaResumo & {
  total: string;
  desconto: string;
  custo: string;
  lucro: string;
  observacao: string;
  desfeita_em: string | null;
  desfeita_por: string | null;
  itens: ItemDaVenda[];
  pagamentos: { id: number; forma: string; forma_rotulo: string; valor: string }[];
};

export type ContaAPagar = {
  id: number;
  descricao: string;
  categoria: string;
  categoria_rotulo: string;
  fornecedor: string;
  valor: string;
  vencimento: string;
  loja: number | null;
  loja_nome: string | null;
  observacao: string;
  paga: boolean;
  paga_em: string | null;
  forma: string;
  forma_rotulo: string;
  repete: boolean;
  dia_da_repeticao: number | null;
  lancada_por: string | null;
  paga_por: string | null;
  criado_em: string;
};

export type TotalDeContas = { valor: string; contas: number };

export type ResumoDasContas = {
  vencidas: TotalDeContas;
  proximos_dias: TotalDeContas;
  pagas_no_mes: TotalDeContas;
};

export type ContaAReceber = {
  id: number;
  numero: number;
  cliente_nome: string;
  cliente_telefone: string;
  aparelho_descricao: string;
  loja: number;
  loja_nome: string;
  valor_cobrado: string;
  valor_pago: string;
  saldo: string;
  pagamento_combinado_para: string | null;
  entregue_em: string;
  quitada_em: string | null;
};

export type TotalAReceber = { valor: string; ordens: number };

export type MovimentoDoCaixa = {
  id: number;
  loja: number;
  tipo: "retirada" | "reforco";
  tipo_rotulo: string;
  valor: string;
  motivo: string;
  registrado_por: string | null;
  criado_em: string;
};

export type ConferenciaDoCaixa = {
  id: number;
  loja: number;
  dia: string;
  contado: string;
  na_gaveta: string;
  retirado: string;
  observacao: string;
  conferida_por: string | null;
  criado_em: string;
  esperado?: string | null;
  diferenca?: string | null;
};

export type MovimentoDoDia = {
  momento: string | null;
  tipo: "ordem" | "venda" | "venda_desfeita" | "conta" | "retirada" | "reforco";
  descricao: string;
  forma: string;
  forma_rotulo: string;
  valor: string;
  usuario: string | null;
  ordem: number | null;
  venda: number | null;
  conta: number | null;
  movimento: number | null;
};

export type CaixaDoDia = {
  dia: string;
  gaveta: {
    comeco: string | null;
    entrou: string;
    saiu: string;
    retiradas: string;
    reforcos: string;
    depois_da_conferencia: string | null;
    deve_ter: string | null;
  };
  por_forma: { forma: string; rotulo: string; entrou: string; saiu: string }[];
  conferencias: ConferenciaDoCaixa[];
  movimentos: MovimentoDoDia[];
};

export type CaixaDeHoje = {
  dia: string;
  movimentos: MovimentoDoCaixa[];
  conferencias: ConferenciaDoCaixa[];
};

export type CaixaDaLoja = {
  loja: number;
  loja_nome: string;
  conferida_em: string | null;
  diferenca: string | null;
};

export type ResumoDoAReceber = {
  vencidas: TotalAReceber;
  proximos_dias: TotalAReceber;
  recebido_no_mes: TotalAReceber;
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
    para_hoje: number;
    aguardando_cliente: number;
    aguardando_peca: number;
    prontas: number;
    por_status: LinhaDeStatus[];
  };
  estoque: { para_repor: number };
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
    balcao: { recebido: Comparacao<string>; vendas: number };
    descontos: Comparacao<string>;
    ticket_medio: Comparacao<string | null>;
    taxa_de_aprovacao: Comparacao<number | null>;
    a_receber: TotalAReceber & { vencidas: TotalAReceber };
    a_pagar: Pick<ResumoDasContas, "vencidas" | "proximos_dias">;
    caixa: CaixaDaLoja[];
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

export type CustoDoMes = { id: number; descricao: string; valor: string };

export type AlertaDeUso = "sem_ordens" | "parou";

export type LinhaDaAssistencia = {
  id: number;
  nome: string;
  dono: string;
  email: string;
  whatsapp: string;
  cadastro: string;
  situacao: SituacaoDaAssinatura | null;
  situacao_rotulo: string;
  ordens_no_mes: number;
  ordens_no_total: number;
  dias_sem_ordem: number | null;
  ultimo_acesso: string | null;
  dias_sem_acesso: number | null;
  alerta: AlertaDeUso | null;
};

export type MesesDoPainel = { escolhido: string; anterior: string | null; seguinte: string | null };

export type PainelDaPlataforma = {
  mes: MesesDoPainel;
  dinheiro: {
    recebido: string;
    faturas_pagas: number;
    taxas: string;
    custos: string;
    lucro: string;
    lista_de_custos: CustoDoMes[];
  };
  assinaturas: {
    por_situacao: { situacao: SituacaoDaAssinatura; rotulo: string; total: number }[];
    receita_recorrente: { valor: string; assinaturas: number };
    conversao: { assinaram: number; decidiram: number; taxa: number | null };
    novas_no_mes: number;
    canceladas_no_mes: number;
  };
  crescimento: {
    cadastros_por_semana: { inicio: string; total: number }[];
    recebido_por_mes: { mes: string; recebido: string }[];
  };
  assistencias: LinhaDaAssistencia[];
};
