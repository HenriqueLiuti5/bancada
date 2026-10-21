import Link from "next/link";
import { CashRegisterIcon, PackageIcon, PlusIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import type { EscolhaDeProdutos, Loja } from "@/lib/tipos";
import { NovaVenda } from "./formulario";

export const dynamic = "force-dynamic";

export default async function VendaNova() {
  const [escolha, lojas] = await Promise.all([
    chamarApi<EscolhaDeProdutos>("/api/produtos/escolha/"),
    chamarApi<Loja[]>("/api/lojas/"),
  ]);

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/estoque/vendas", rotulo: "Vendas no balcão" }}
        titulo="Nova venda"
        descricao="Os produtos saem do estoque e o valor entra no painel."
      />
      <div className="max-w-3xl">
        <Cartao titulo="Venda no balcão" icone={CashRegisterIcon}>
          {escolha.produtos.length === 0 ? (
            <EstadoVazio
              icone={PackageIcon}
              titulo="Nenhum produto para vender"
              descricao="Cadastre os acessórios e as peças da loja antes da primeira venda."
              acao={
                <Link href="/estoque/novo" className={botao("primario", "sm")}>
                  <PlusIcon size={16} />
                  Cadastrar produto
                </Link>
              }
            />
          ) : (
            <NovaVenda escolha={escolha} lojas={lojas.filter((loja) => loja.ativa)} />
          )}
        </Cartao>
      </div>
    </>
  );
}
