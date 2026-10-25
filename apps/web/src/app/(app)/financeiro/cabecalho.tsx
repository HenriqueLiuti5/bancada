import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Segmento, Segmentos } from "@/componentes/ui/Segmentos";

type Aba = "a_pagar" | "a_receber" | "caixa" | "lancar";

// As três abas do dono não cabem no celular com o rótulo inteiro.
type DefinicaoDaAba = { aba: Aba; href: string; rotulo: string; curto?: string };

const ABAS_DO_DONO: DefinicaoDaAba[] = [
  { aba: "a_pagar", href: "/financeiro", rotulo: "Contas a pagar", curto: "A pagar" },
  { aba: "a_receber", href: "/financeiro/a-receber", rotulo: "Contas a receber", curto: "A receber" },
  { aba: "caixa", href: "/financeiro/caixa", rotulo: "Caixa do dia" },
];

const ABAS_DA_EQUIPE: DefinicaoDaAba[] = [
  { aba: "lancar", href: "/financeiro", rotulo: "Lançar conta" },
  { aba: "caixa", href: "/financeiro/caixa", rotulo: "Caixa do dia" },
];

export function CabecalhoDoFinanceiro({
  ativa,
  dono,
  titulo,
  descricao,
  acoes,
}: {
  ativa: Aba;
  dono: boolean;
  titulo: string;
  descricao: string;
  acoes?: React.ReactNode;
}) {
  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao={descricao} acoes={acoes} />
      <div className="mb-6">
        <Segmentos tour="abas-do-financeiro">
          {(dono ? ABAS_DO_DONO : ABAS_DA_EQUIPE).map(({ aba, href, rotulo, curto }) => (
            <Segmento key={aba} href={href} ativo={aba === ativa} curto={curto}>
              {rotulo}
            </Segmento>
          ))}
        </Segmentos>
      </div>
    </>
  );
}
