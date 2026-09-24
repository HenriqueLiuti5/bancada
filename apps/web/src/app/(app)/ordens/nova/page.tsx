import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { chamarApi } from "@/lib/api";
import type { Loja } from "@/lib/tipos";
import { FormularioDeAbertura } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NovaOrdem() {
  const lojas = await chamarApi<Loja[]>("/api/lojas/");

  return (
    <div className="max-w-2xl">
      <CabecalhoDaPagina
        voltar={{ href: "/ordens", rotulo: "Ordens de serviço" }}
        titulo="Nova ordem de serviço"
        descricao="Busque o cliente ou cadastre na hora, junto com o aparelho. Se o cliente tiver e-mail, ele recebe o link de acompanhamento assim que a ordem abre."
      />
      <FormularioDeAbertura lojas={lojas} />
    </div>
  );
}
