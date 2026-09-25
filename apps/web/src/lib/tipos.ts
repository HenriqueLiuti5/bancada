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

export type UsuarioAtual = Usuario & {
  tours_vistos: string[];
  primeiros_passos_escondidos: boolean;
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
};

export type LinhaDeStatus = { status: string; rotulo: string; total: number };

export type Painel = {
  abertas: number;
  atrasadas: number;
  aguardando_cliente: number;
  aguardando_peca: number;
  prontas: number;
  abertas_hoje: number;
  entregues_no_mes: number;
  por_status: LinhaDeStatus[];
  dias_medios_de_reparo: number | null;
  valor_aprovado_em_aberto: string;
  dias_da_media: number;
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
