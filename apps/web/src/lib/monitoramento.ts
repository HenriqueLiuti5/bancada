// Envia ao serviço de monitoramento os erros do servidor do Next, no mesmo formato que o SDK do
// Sentry usa, aceito também pelo GlitchTip. Só sai o tipo do erro, a mensagem, as linhas de código
// e o desenho da rota (/os/[token], nunca o token): nada de cabeçalhos, cookies, endereço de quem
// acessa ou corpo do pedido. Sem SENTRY_DSN, nada é enviado.

type Destino = { endereco: string; chave: string };

type Quadro = { function?: string; filename: string; lineno: number; colno: number; in_app: boolean };

const MAXIMO_DE_QUADROS = 50;
const CINCO_SEGUNDOS = 5000;
const LINHA_DA_PILHA = /^\s*at (?:(?:async )?(.+?) \()?(.+?):(\d+):(\d+)\)?$/;

function lerDestino(dsn: string | undefined): Destino | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const partes = url.pathname.split("/").filter(Boolean);
    const projeto = partes.pop();
    if (!url.username || !projeto) return null;
    const prefixo = partes.length ? `/${partes.join("/")}` : "";
    return {
      endereco: `${url.protocol}//${url.host}${prefixo}/api/${projeto}/envelope/`,
      chave: url.username,
    };
  } catch {
    return null;
  }
}

function quadrosDaPilha(pilha: string | undefined): Quadro[] {
  const quadros: Quadro[] = [];
  for (const linha of (pilha ?? "").split("\n")) {
    const partes = LINHA_DA_PILHA.exec(linha);
    if (!partes) continue;
    const [, funcao, arquivo, linhaDoArquivo, coluna] = partes;
    quadros.push({
      function: funcao,
      filename: arquivo,
      lineno: Number(linhaDoArquivo),
      colno: Number(coluna),
      in_app: !arquivo.includes("node_modules"),
    });
  }
  // O Sentry espera a chamada mais antiga primeiro; a pilha do Node vem ao contrário.
  return quadros.slice(0, MAXIMO_DE_QUADROS).reverse();
}

function montarEnvelope(
  erro: unknown,
  rota: string,
  etiquetas: Record<string, string>,
): string {
  const excecao = erro instanceof Error ? erro : new Error(String(erro));
  const id = crypto.randomUUID().replaceAll("-", "");
  const evento = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    logger: "next",
    environment: process.env.SENTRY_ENVIRONMENT ?? "producao",
    release: process.env.VERSAO,
    server_name: "web",
    transaction: rota,
    tags: etiquetas,
    exception: {
      values: [
        {
          type: excecao.name,
          value: excecao.message,
          stacktrace: { frames: quadrosDaPilha(excecao.stack) },
        },
      ],
    },
  };
  return [
    JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(evento),
  ].join("\n");
}

export async function avisarDoErro(
  erro: unknown,
  rota: string,
  etiquetas: Record<string, string>,
): Promise<void> {
  const destino = lerDestino(process.env.SENTRY_DSN);
  if (!destino) return;
  try {
    await fetch(destino.endereco, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${destino.chave}, sentry_client=bancada-web/1.0`,
      },
      body: montarEnvelope(erro, rota, etiquetas),
      signal: AbortSignal.timeout(CINCO_SEGUNDOS),
    });
  } catch {
    // O monitoramento fora do ar não pode atrapalhar a página de quem está usando o sistema.
  }
}
