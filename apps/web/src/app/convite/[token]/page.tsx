import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { ErroDaApi, chamarApi, mensagemDaApi } from "@/lib/api";
import type { ConvitePublico } from "@/lib/tipos";
import { FormularioDoConvite } from "./formulario";

export const dynamic = "force-dynamic";
export const metadata = { title: "Convite · Bancada" };

type Props = { params: Promise<{ token: string }> };

type Busca = { convite: ConvitePublico } | { problema: string };

async function buscarConvite(token: string): Promise<Busca> {
  try {
    const convite = await chamarApi<ConvitePublico>(
      `/api/publico/convites/${encodeURIComponent(token)}/`,
      { autenticado: false },
    );
    return { convite };
  } catch (erro) {
    if (erro instanceof ErroDaApi && erro.status === 404) {
      return { problema: mensagemDaApi(erro, "Convite não encontrado.") };
    }
    return { problema: "Não foi possível abrir o convite agora. Tente de novo em instantes." };
  }
}

export default async function Convite({ params }: Props) {
  const { token } = await params;
  const busca = await buscarConvite(token);

  if ("problema" in busca) {
    return (
      <TelaDeAcesso
        titulo="Convite indisponível"
        rodape={
          <Link href="/login" className={link}>
            Ir para o login
          </Link>
        }
      >
        <p className="text-[15px] text-texto-apagado">{busca.problema}</p>
      </TelaDeAcesso>
    );
  }

  const { convite } = busca;
  return (
    <TelaDeAcesso
      titulo={`Entre na equipe da ${convite.assistencia}`}
      descricao={`Você vai entrar como ${convite.papel_rotulo.toLowerCase()}.`}
    >
      <FormularioDoConvite token={token} convite={convite} />
    </TelaDeAcesso>
  );
}
