import Link from "next/link";
import { DeviceMobileIcon, UserIcon, UserSwitchIcon } from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import type { Aparelho, Cliente, Ordem } from "@/lib/tipos";
import { podeVerSenha, usuarioAtual } from "@/lib/usuario";
import { FormularioDoAparelho, FormularioDoCliente } from "./formularios";

export const dynamic = "force-dynamic";

export default async function ClienteEAparelhoDaOrdem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ordem, usuario] = await Promise.all([
    chamarApi<Ordem>(`/api/ordens/${id}/`),
    usuarioAtual(),
  ]);
  const [cliente, aparelho] = await Promise.all([
    chamarApi<Cliente>(`/api/clientes/${ordem.cliente}/`),
    chamarApi<Aparelho>(`/api/aparelhos/${ordem.aparelho}/`),
  ]);
  const senhaCorrigivelNaOrdem = podeVerSenha(usuario) && !ordem.encerrada;

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: `/ordens/${ordem.id}`, rotulo: `OS #${ordem.numero}` }}
        titulo="Cliente e aparelho"
        descricao="Corrija o que foi anotado errado. A correção vale para todas as ordens deste cliente."
      />

      <div className="max-w-3xl space-y-6">
        {!ordem.encerrada && (
          <Alerta
            tom="info"
            icone={UserSwitchIcon}
            titulo="A ordem foi aberta no cliente errado?"
            acao={
              <Link href={`/ordens/${ordem.id}/cliente/trocar`} className={botao("secundario", "sm")}>
                Trocar o cliente
              </Link>
            }
          >
            Não corrija os dados aqui, porque a correção muda o cadastro dessa pessoa em todas as ordens
            dela. Troque o cliente da ordem.
          </Alerta>
        )}

        <Cartao titulo="Cliente" icone={UserIcon}>
          <FormularioDoCliente ordem={ordem.id} cliente={cliente} />
        </Cartao>

        <Cartao
          titulo="Aparelho"
          icone={DeviceMobileIcon}
          descricao={
            senhaCorrigivelNaOrdem
              ? "A senha de desbloqueio é corrigida na tela da ordem, no cartão da senha."
              : undefined
          }
        >
          <FormularioDoAparelho ordem={ordem.id} aparelho={aparelho} />
        </Cartao>
      </div>
    </>
  );
}
