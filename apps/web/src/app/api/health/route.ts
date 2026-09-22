import { NextResponse } from "next/server";
import { fetchHealth } from "@/lib/health";

export async function GET() {
  const health = await fetchHealth();
  const code = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: code });
}
