import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { chamarApi } from "@/lib/api";
import type { Cliente, Loja, Pagina } from "@/lib/tipos";
import { FormularioDeAbertura } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NovaOrdem() {
  const [lojas, clientes] = await Promise.all([
    chamarApi<Loja[]>("/api/lojas/"),
    chamarApi<Pagina<Cliente>>("/api/clientes/"),
  ]);

  return (
    <div className="max-w-2xl">
      <CabecalhoDaPagina
        voltar={{ href: "/ordens", rotulo: "Ordens de serviço" }}
        titulo="Nova ordem de serviço"
        descricao="Registre o aparelho e o defeito. Se o cliente tiver e-mail, ele recebe o link de acompanhamento na hora."
      />
      <FormularioDeAbertura lojas={lojas} clientes={clientes.results} />
    </div>
  );
}
