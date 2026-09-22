import { cookies } from "next/headers";

const NOME_DO_COOKIE = "bancada_token";
const TRINTA_DIAS = 60 * 60 * 24 * 30;

export async function lerToken(): Promise<string | null> {
  const armazem = await cookies();
  return armazem.get(NOME_DO_COOKIE)?.value ?? null;
}

export async function gravarToken(token: string): Promise<void> {
  const armazem = await cookies();
  armazem.set(NOME_DO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: TRINTA_DIAS,
  });
}

export async function limparToken(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(NOME_DO_COOKIE);
}

export { NOME_DO_COOKIE };
