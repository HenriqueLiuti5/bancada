import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { ErroDaApi, chamarApi, mensagemDaApi } from "@/lib/api";
import { nomeDoMes } from "@/lib/datas";
import type { PainelDaPlataforma } from "@/lib/tipos";
import { usuarioAtual } from "@/lib/usuario";
import { SecaoAssinaturas } from "./assinaturas";
import { SecaoAssistencias } from "./assistencias";
import { SecaoCrescimento } from "./crescimento";
import { SecaoDinheiro } from "./dinheiro";
import { NavegacaoDoMes } from "./navegacaoDoMes";

export const dynamic = "force-dynamic";

type Parametros = Record<string, string | string[] | undefined>;

async function buscarPainel(mes: string): Promise<{ painel: PainelDaPlataforma; erro?: string }> {
  const caminho = mes
    ? `/api/plataforma/painel/?${new URLSearchParams({ mes })}`
    : "/api/plataforma/painel/";
  try {
    return { painel: await chamarApi<PainelDaPlataforma>(caminho) };
  } catch (erro) {
    if (!(erro instanceof ErroDaApi) || erro.status !== 400) throw erro;
    return {
      painel: await chamarApi<PainelDaPlataforma>("/api/plataforma/painel/"),
      erro: mensagemDaApi(erro, "Não deu para abrir esse mês. Mostramos o mês atual."),
    };
  }
}

export default async function PaginaDaPlataforma({
  searchParams,
}: {
  searchParams: Promise<Parametros>;
}) {
  const { mes } = await searchParams;
  const [{ painel, erro }, usuario] = await Promise.all([
    buscarPainel(typeof mes === "string" ? mes : ""),
    usuarioAtual(),
  ]);
  const nome = nomeDoMes(painel.mes.escolhido);
  const quemFala = (usuario.first_name || usuario.username).split(" ")[0];

  return (
    <>
      <CabecalhoDaPagina
        titulo="Painel da plataforma"
        descricao="Os números de todas as assistências. Só a conta da plataforma vê esta área."
        acoes={<NavegacaoDoMes meses={painel.mes} />}
      />

      <div className="space-y-10">
        {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
        <SecaoDinheiro dinheiro={painel.dinheiro} mes={painel.mes.escolhido} nome={nome} />
        <SecaoAssinaturas assinaturas={painel.assinaturas} nome={nome} />
        <SecaoCrescimento crescimento={painel.crescimento} />
        <SecaoAssistencias
          assistencias={painel.assistencias}
          nomeDoMes={nome}
          quemFala={quemFala}
        />
      </div>
    </>
  );
}
