import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import type { Assistencia, Loja } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { FormularioDaAssistencia, FormularioDaLoja } from "./formularios";

export const dynamic = "force-dynamic";

export default async function PaginaDaAssistencia() {
  const usuario = await usuarioAtual();

  if (!gerenciaEquipe(usuario)) {
    return (
      <CabecalhoDaPagina
        titulo="Assistência"
        descricao="Só o dono altera os dados da assistência."
      />
    );
  }

  const [assistencia, lojas] = await Promise.all([
    chamarApi<Assistencia>("/api/assistencia/"),
    chamarApi<Loja[]>("/api/lojas/"),
  ]);

  return (
    <>
      <CabecalhoDaPagina
        titulo="Assistência"
        descricao="Os dados que aparecem para os seus clientes no comprovante, no recibo e nos avisos."
      />

      <div className="max-w-3xl space-y-6">
        <Cartao titulo="Dados da assistência">
          <FormularioDaAssistencia assistencia={assistencia} />
        </Cartao>

        {lojas.map((loja) => (
          <Cartao
            key={loja.id}
            titulo={lojas.length > 1 ? loja.nome : "Loja"}
            descricao="Telefone e endereço aparecem para o cliente."
          >
            <FormularioDaLoja loja={loja} />
          </Cartao>
        ))}
      </div>
    </>
  );
}
