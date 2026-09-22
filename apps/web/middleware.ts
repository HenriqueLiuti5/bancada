import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SEM_LOGIN = ["/os"];
const SO_PARA_DESLOGADO = ["/login"];

export function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  const token = request.cookies.get("bancada_token")?.value;

  if (SEM_LOGIN.some((rota) => caminho.startsWith(rota))) {
    return NextResponse.next();
  }

  if (SO_PARA_DESLOGADO.some((rota) => caminho.startsWith(rota))) {
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
