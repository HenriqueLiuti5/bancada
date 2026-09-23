const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export type EtapaPublica = { status: string; rotulo: string; em: string };

export type FotoPublica = {
  assinatura: string;
  momento: string;
  momento_rotulo: string;
  legenda: string;
  largura: number;
  altura: number;
};

export type AcompanhamentoPublico = {
  numero: number;
  status: string;
  status_rotulo: string;
  mensagem: string;
  encerrada: boolean;
  aparelho: string;
  cliente_primeiro_nome: string;
  assistencia: { nome: string; telefone: string };
  aberta_em: string;
  prometida_para: string | null;
  entregue_em: string | null;
  linha_do_tempo: EtapaPublica[];
  fotos: FotoPublica[];
  orcamento?: { total: string; itens: { descricao: string; valor: string }[] };
};

export type ResultadoPublico =
  | { tipo: "ok"; dados: AcompanhamentoPublico }
  | { tipo: "inexistente" }
  | { tipo: "expirado" }
  | { tipo: "indisponivel" };

export async function buscarAcompanhamento(token: string): Promise<ResultadoPublico> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/publico/os/${encodeURIComponent(token)}/`, {
      cache: "no-store",
    });
  } catch {
    return { tipo: "indisponivel" };
  }

  if (resposta.status === 404) return { tipo: "inexistente" };
  if (resposta.status === 410) return { tipo: "expirado" };
  if (!resposta.ok) return { tipo: "indisponivel" };

  return { tipo: "ok", dados: (await resposta.json()) as AcompanhamentoPublico };
}
