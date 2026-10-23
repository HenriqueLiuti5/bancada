import { redirect } from "next/navigation";
import { ReceiptIcon } from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import { hojeEmIso } from "@/lib/datas";
import type { Loja } from "@/lib/tipos";
import { fusoDaAssistencia, gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { NovaConta } from "../../novaConta";

export const dynamic = "force-dynamic";

// A equipe lança a conta na própria tela do Financeiro, que para ela é só o formulário.
export default async function LancamentoDeConta() {
  const usuario = await usuarioAtual();
  if (!gerenciaEquipe(usuario)) redirect("/financeiro");

  const [lojas, fornecedores] = await Promise.all([
    chamarApi<Loja[]>("/api/lojas/"),
    chamarApi<string[]>("/api/contas-a-pagar/fornecedores/"),
  ]);

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/financeiro", rotulo: "Contas a pagar" }}
        titulo="Lançar conta"
        descricao="Aluguel, luz, salários, compras de peças e o que mais a loja paga."
      />
      <div className="max-w-3xl">
        <Cartao titulo="Conta" icone={ReceiptIcon}>
          <NovaConta
            lojas={lojas.filter((loja) => loja.ativa)}
            fornecedores={fornecedores}
            hoje={hojeEmIso(fusoDaAssistencia(usuario))}
            eDono
          />
        </Cartao>
      </div>
    </>
  );
}
