import { levarAoUmami } from "@/lib/estatisticas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const resposta = await levarAoUmami("/script.js", { method: "GET" });
  if (!resposta?.ok) return new Response(null, { status: 404 });

  return new Response(await resposta.text(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
