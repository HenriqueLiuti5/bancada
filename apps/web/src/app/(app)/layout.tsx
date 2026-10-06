import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_DA_LATERAL, lateralRecolhida } from "@/lib/lateral";
import { linkDoSuporte } from "@/lib/suporte";
import { gerenciaEquipe, rotuloDoPapel, usuarioAtual } from "@/lib/usuario";
import { AvisoDaAssinatura } from "./avisoDaAssinatura";
import { AvisoDeEmail } from "./avisoDeEmail";
import { BarraLateral } from "./barraLateral";
import { ForaDa } from "./foraDa";
import { ProvedorDeTour } from "./tour";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  if (usuario.da_plataforma) redirect("/plataforma");

  const nome = usuario.first_name || usuario.username;
  const assistencia = usuario.tenant?.nome ?? "";
  const eDono = gerenciaEquipe(usuario);
  const recolhida = lateralRecolhida((await cookies()).get(COOKIE_DA_LATERAL)?.value);

  return (
    <ProvedorDeTour papel={usuario.papel} vistos={usuario.tours_vistos}>
      <div className="min-h-screen lg:flex">
        <BarraLateral
          nome={nome}
          papel={rotuloDoPapel(usuario.papel)}
          assistencia={assistencia}
          eDono={eDono}
          linkDoSuporte={linkDoSuporte(nome, assistencia)}
          podeReabrirPrimeirosPassos={eDono && usuario.primeiros_passos_escondidos}
          recolhidaDeInicio={recolhida}
        />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:py-10">
            {usuario.assinatura && (
              <ForaDa caminho="/assinatura">
                <AvisoDaAssinatura assinatura={usuario.assinatura} eDono={eDono} />
              </ForaDa>
            )}
            {!usuario.email_confirmado && usuario.email && <AvisoDeEmail email={usuario.email} />}
            {children}
          </div>
        </main>
      </div>
    </ProvedorDeTour>
  );
}
