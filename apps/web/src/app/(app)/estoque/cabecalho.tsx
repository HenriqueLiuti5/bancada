import Link from "next/link";
import { CashRegisterIcon, PlusIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";
import { botao } from "@/componentes/ui/estilos";

export function CabecalhoDoEstoque({
  ativa,
  descricao,
}: {
  ativa: "produtos" | "vendas";
  descricao: string;
}) {
  return (
    <>
      <CabecalhoDaPagina
        titulo="Estoque e vendas"
        descricao={descricao}
        acoes={
          <>
            <Link href="/estoque/novo" data-tour="cadastrar-produto" className={botao("secundario")}>
              <PlusIcon size={18} />
              Cadastrar produto
            </Link>
            <Link href="/estoque/vendas/nova" data-tour="nova-venda" className={botao("primario")}>
              <CashRegisterIcon size={18} />
              Nova venda
            </Link>
          </>
        }
      />
      <div className="mb-4">
        <Segmentos tour="abas-do-estoque">
          <Segmento href="/estoque" ativo={ativa === "produtos"}>
            Produtos
          </Segmento>
          <Segmento href="/estoque/vendas" ativo={ativa === "vendas"}>
            Vendas no balcão
          </Segmento>
        </Segmentos>
      </div>
    </>
  );
}
