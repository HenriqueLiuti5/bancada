import { linkDoSuporte } from "@/lib/suporte";
import { gerenciaEquipe, rotuloDoPapel, usuarioAtual } from "@/lib/usuario";
import { AvisoDaAssinatura } from "./avisoDaAssinatura";
import { AvisoDeEmail } from "./avisoDeEmail";
import { BarraLateral } from "./barraLateral";
import { ProvedorDeTour } from "./tour";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();
  const nome = usuario.first_name || usuario.username;
  const assistencia = usuario.tenant?.nome ?? "";
  const eDono = gerenciaEquipe(usuario);

  return (
    <ProvedorDeTour papel={usuario.papel} vistos={usuario.tours_vistos}>
      <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <BarraLateral
          nome={nome}
          papel={rotuloDoPapel(usuario.papel)}
          assistencia={assistencia}
          eDono={eDono}
          linkDoSuporte={linkDoSuporte(nome, assistencia)}
          podeReabrirPrimeirosPassos={eDono && usuario.primeiros_passos_escondidos}
        />
        <main className="min-w-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            {usuario.assinatura && (
              <AvisoDaAssinatura assinatura={usuario.assinatura} eDono={eDono} />
            )}
            {!usuario.email_confirmado && usuario.email && <AvisoDeEmail email={usuario.email} />}
            {children}
          </div>
        </main>
      </div>
    </ProvedorDeTour>
  );
}
