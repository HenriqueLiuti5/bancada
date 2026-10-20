import { ImageSquareIcon, MapPinPlusIcon, ProhibitIcon, StorefrontIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import type { Assistencia, Loja } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { FormularioDaAssistencia, FormularioDaLogo } from "./formularios";
import { CartaoDaLoja, LojaDesativada, NovaLoja } from "./lojas";

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
  const ativas = lojas.filter((loja) => loja.ativa);
  const desativadas = lojas.filter((loja) => !loja.ativa);

  return (
    <>
      <CabecalhoDaPagina
        titulo="Assistência"
        descricao="Os dados que aparecem para os seus clientes no comprovante, no recibo e nos avisos."
      />

      <div className="max-w-3xl space-y-6">
        <Cartao titulo="Dados da assistência" icone={StorefrontIcon}>
          <FormularioDaAssistencia assistencia={assistencia} />
        </Cartao>

        <Cartao
          titulo="Logo"
          icone={ImageSquareIcon}
          descricao="Aparece para o cliente no acompanhamento, nos e-mails, no comprovante e no recibo."
        >
          <FormularioDaLogo assistencia={assistencia} />
        </Cartao>

        {ativas.map((loja) => (
          <CartaoDaLoja
            key={loja.id}
            loja={loja}
            titulo={lojas.length > 1 ? loja.nome : "Loja"}
            podeDesativar={ativas.length > 1}
          />
        ))}

        {desativadas.length > 0 && (
          <Cartao
            titulo="Lojas desativadas"
            icone={ProhibitIcon}
            descricao="Não aparecem na abertura de ordens. As ordens que já estavam nelas seguem até a entrega."
            semEspaco
          >
            <ul className="divide-y divide-borda">
              {desativadas.map((loja) => (
                <LojaDesativada key={loja.id} loja={loja} />
              ))}
            </ul>
          </Cartao>
        )}

        <Cartao
          titulo="Nova loja"
          icone={MapPinPlusIcon}
          descricao="Para quem atende em mais de um endereço. Cada ordem fica com a loja onde foi aberta, o cliente vê o nome dessa loja e o painel separa os números de cada uma."
        >
          <NovaLoja />
        </Cartao>
      </div>
    </>
  );
}
