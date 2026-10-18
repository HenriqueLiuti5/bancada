const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
const CINCO_SEGUNDOS = 5000;

export async function GET(): Promise<Response> {
  try {
    const resposta = await fetch(`${BASE}/api/health/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(CINCO_SEGUNDOS),
    });
    if (resposta.ok) return Response.json({ status: "ok" });
  } catch {
    // A API não respondeu a tempo: o site está no ar, mas sem ela nada funciona.
  }
  return Response.json({ status: "indisponivel" }, { status: 503 });
}
