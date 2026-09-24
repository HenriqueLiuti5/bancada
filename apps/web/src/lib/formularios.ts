import { ErroDaApi, mensagemDaApi } from "@/lib/api";

export type EstadoDoFormulario = {
  erro?: string;
  ok?: string;
  erros?: Record<string, string>;
  valores?: Record<string, string>;
};

const CAMPOS_GERAIS = new Set(["detail", "non_field_errors"]);

export function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function mensagemDoCampo(valor: unknown): string | null {
  if (typeof valor === "string") return valor;
  if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  return null;
}

function achatarErros(corpo: Record<string, unknown>, prefixo = ""): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(corpo)) {
    if (!prefixo && CAMPOS_GERAIS.has(campo)) continue;

    const caminho = prefixo ? `${prefixo}.${campo}` : campo;
    const mensagem = mensagemDoCampo(valor);
    if (mensagem) erros[caminho] = mensagem;
    else if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      Object.assign(erros, achatarErros(valor as Record<string, unknown>, caminho));
    }
  }
  return erros;
}

function errosDosCampos(erro: unknown): Record<string, string> {
  if (!(erro instanceof ErroDaApi) || erro.status !== 400) return {};
  return achatarErros((erro.corpo ?? {}) as Record<string, unknown>);
}

export function estadoDeErro(
  erro: unknown,
  alternativa: string,
  valores: Record<string, string> = {},
): EstadoDoFormulario {
  const erros = errosDosCampos(erro);
  const semErroDeCampo = Object.keys(erros).length === 0;
  return { erros, valores, erro: semErroDeCampo ? mensagemDaApi(erro, alternativa) : undefined };
}
