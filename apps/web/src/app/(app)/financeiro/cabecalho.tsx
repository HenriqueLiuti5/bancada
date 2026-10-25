import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";

export function CabecalhoDoFinanceiro({
  ativa,
  titulo,
  descricao,
  acoes,
}: {
  ativa: "a_pagar" | "a_receber";
  titulo: string;
  descricao: string;
  acoes?: React.ReactNode;
}) {
  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao={descricao} acoes={acoes} />
      <div className="mb-6">
        <Segmentos tour="abas-do-financeiro">
          <Segmento href="/financeiro" ativo={ativa === "a_pagar"}>
            Contas a pagar
          </Segmento>
          <Segmento href="/financeiro/a-receber" ativo={ativa === "a_receber"}>
            Contas a receber
          </Segmento>
        </Segmentos>
      </div>
    </>
  );
}
