import { WarningCircleIcon } from "@/componentes/icones";
import { Alerta } from "@/componentes/ui/Alerta";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { chamarApi } from "@/lib/api";
import type { Ordem } from "@/lib/tipos";
import { FormularioDaTroca } from "./formulario";

export const dynamic = "force-dynamic";

export default async function TrocaDoCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ordem = await chamarApi<Ordem>(`/api/ordens/${id}/`);

  return (
    <div className="max-w-2xl">
      <CabecalhoDaPagina
        voltar={{ href: `/ordens/${ordem.id}/cliente`, rotulo: "Cliente e aparelho" }}
        titulo="Trocar o cliente"
        descricao={`Para quando a OS #${ordem.numero} foi aberta no cliente errado. Ela passa para o cliente certo com as fotos, o orçamento e o histórico.`}
      />
      {ordem.encerrada ? (
        <Alerta
          tom="aviso"
          icone={WarningCircleIcon}
          titulo="Esta ordem já foi encerrada e não troca mais de cliente."
        />
      ) : (
        <FormularioDaTroca ordem={ordem} />
      )}
    </div>
  );
}
