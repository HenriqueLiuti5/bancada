import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLICAS = ["/login"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("bancada_token")?.value;
  const caminho = request.nextUrl.pathname;
  const ehPublica = PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!token && !ehPublica) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && ehPublica) {
    return NextResponse.redirect(new URL("/ordens", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
