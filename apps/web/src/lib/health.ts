export type Check = { ok: boolean; detail: string };

export type Health = {
  status: "ok" | "degraded" | "unreachable";
  checks: Record<string, Check>;
};

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export async function fetchHealth(): Promise<Health> {
  try {
    const response = await fetch(`${API_INTERNAL_URL}/api/health/`, { cache: "no-store" });
    return (await response.json()) as Health;
  } catch (error) {
    return {
      status: "unreachable",
      checks: {
        api: {
          ok: false,
          detail: error instanceof Error ? error.message : "erro desconhecido",
        },
      },
    };
  }
}
