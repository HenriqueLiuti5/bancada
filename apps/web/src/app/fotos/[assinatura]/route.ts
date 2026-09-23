const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

type Contexto = { params: Promise<{ assinatura: string }> };

export async function GET(_pedido: Request, contexto: Contexto): Promise<Response> {
  const { assinatura } = await contexto.params;

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/fotos/arquivo/${encodeURIComponent(assinatura)}/`, {
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!resposta.ok || !resposta.body) {
    return new Response(null, { status: resposta.status === 404 ? 404 : 502 });
  }

  return new Response(resposta.body, {
    headers: {
      "Content-Type": resposta.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=900",
    },
  });
}
