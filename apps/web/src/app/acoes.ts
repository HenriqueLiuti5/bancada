"use server";

import { redirect } from "next/navigation";
import { chamarApi } from "@/lib/api";
import { limparToken } from "@/lib/sessao";

export async function sair() {
  try {
    await chamarApi("/api/auth/logout/", { metodo: "POST" });
  } catch {
  }
  await limparToken();
  redirect("/login");
}
