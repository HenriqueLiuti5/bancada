import { PackageIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import type { Loja } from "@/lib/tipos";
import { NovoProduto } from "./formulario";

export const dynamic = "force-dynamic";

export default async function CadastroDeProduto() {
  const lojas = await chamarApi<Loja[]>("/api/lojas/");

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/estoque", rotulo: "Estoque e vendas" }}
        titulo="Cadastrar produto"
        descricao="Uma peça que a loja guarda para os consertos ou um acessório que vende no balcão."
      />
      <div className="max-w-3xl">
        <Cartao titulo="Produto" icone={PackageIcon}>
          <NovoProduto lojas={lojas.filter((loja) => loja.ativa)} />
        </Cartao>
      </div>
    </>
  );
}
