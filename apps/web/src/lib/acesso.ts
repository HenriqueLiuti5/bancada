import { chamarApi } from "@/lib/api";
import { gravarToken } from "@/lib/sessao";
import type { Sessao } from "@/lib/tipos";

export async function abrirSessaoPor(caminho: string, corpo: unknown): Promise<Sessao> {
  const sessao = await chamarApi<Sessao>(caminho, { metodo: "POST", corpo, autenticado: false });
  await gravarToken(sessao.token);
  return sessao;
}
