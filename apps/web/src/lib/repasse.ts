const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export async function repassarImagem(caminho: string, tipoPadrao: string): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, { cache: "no-store" });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!resposta.ok || !resposta.body) {
    return new Response(null, { status: resposta.status === 404 ? 404 : 502 });
  }

  return new Response(resposta.body, {
    headers: {
      "Content-Type": resposta.headers.get("content-type") ?? tipoPadrao,
      "Cache-Control": "private, max-age=900",
    },
  });
}
