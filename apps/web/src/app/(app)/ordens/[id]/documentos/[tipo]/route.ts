import { lerToken } from "@/lib/sessao";

const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
const DOCUMENTOS = ["comprovante", "recibo"];

type Contexto = { params: Promise<{ id: string; tipo: string }> };

export async function GET(_pedido: Request, contexto: Contexto): Promise<Response> {
  const { id, tipo } = await contexto.params;

  if (!DOCUMENTOS.includes(tipo)) return new Response(null, { status: 404 });

  const token = await lerToken();
  if (!token) return new Response(null, { status: 401 });

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/ordens/${id}/${tipo}/`, {
      headers: { Authorization: `Token ${token}` },
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!resposta.ok || !resposta.body) {
    return new Response(null, { status: resposta.status === 404 ? 404 : 502 });
  }

  const nome = resposta.headers.get("content-disposition");

  return new Response(resposta.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": nome ?? `inline; filename="OS-${id}-${tipo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
