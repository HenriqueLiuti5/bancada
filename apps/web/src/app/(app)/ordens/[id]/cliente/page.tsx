import { DeviceMobileIcon, UserIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
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
