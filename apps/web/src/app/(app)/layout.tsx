import { gerenciaEquipe, rotuloDoPapel, usuarioAtual } from "@/lib/usuario";
import { AvisoDeEmail } from "./avisoDeEmail";
import { BarraLateral } from "./barraLateral";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <BarraLateral
        nome={usuario.first_name || usuario.username}
        papel={rotuloDoPapel(usuario.papel)}
        assistencia={usuario.tenant?.nome ?? ""}
        eDono={gerenciaEquipe(usuario)}
      />
      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {!usuario.email_confirmado && usuario.email && <AvisoDeEmail email={usuario.email} />}
          {children}
        </div>
      </main>
    </div>
  );
}
