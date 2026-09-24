import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NOME_DO_COOKIE, SESSAO_EXPIRADA } from "@/lib/sessao";

const SEM_LOGIN = [
  "/os",
  "/fotos",
  "/convite",
  "/redefinir-senha",
  "/confirmar-email",
  "/termos",
  "/privacidade",
];
const SO_PARA_DESLOGADO = ["/login", "/cadastro", "/esqueci-senha"];

function esquecerSessao(): NextResponse {
  const resposta = NextResponse.next();
  resposta.cookies.delete(NOME_DO_COOKIE);
  return resposta;
}

export function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  const token = request.cookies.get(NOME_DO_COOKIE)?.value;

  if (SEM_LOGIN.some((rota) => caminho.startsWith(rota))) {
    return NextResponse.next();
  }

  if (SO_PARA_DESLOGADO.some((rota) => caminho.startsWith(rota))) {
    if (request.nextUrl.searchParams.get("sessao") === SESSAO_EXPIRADA) return esquecerSessao();
    return token ? NextResponse.redirect(new URL("/ordens", request.url)) : NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
