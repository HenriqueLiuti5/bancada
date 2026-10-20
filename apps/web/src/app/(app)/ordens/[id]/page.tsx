import {
  CameraIcon,
  ClockCounterClockwiseIcon,
  FileTextIcon,
  NotePencilIcon,
  ReceiptIcon,
} from "@/componentes/icones";
import { Abas } from "@/componentes/ui/Abas";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { diaEHora, hojeEmIso } from "@/lib/datas";
import type { Ordem, Usuario } from "@/lib/tipos";
import {
  fusoDaAssistencia,
  gerenciaEquipe,
  podeApagar,
  podeVerSenha,
  usuarioAtual,
} from "@/lib/usuario";
import { Tour } from "../../tour";
import { AnotacoesDoReparo } from "./anotacoesDoReparo";
import { FichaDaOrdem } from "./fichaDaOrdem";
import { FotosDaOrdem } from "./fotosDaOrdem";
import { HistoricoDaOrdem } from "./historicoDaOrdem";
import { OrcamentoDaOrdem } from "./orcamentoDaOrdem";
import { PagamentoDaOrdem } from "./pagamentoDaOrdem";
import { PainelDaEtapa } from "./painelDaEtapa";

export const dynamic = "force-dynamic";

const STATUS_COM_RECIBO = ["pronto", "entregue", "devolvido_sem_reparo"];

function abaInicial(ordem: Ordem): string {
  if (ordem.status === "recebido") return "fotos";
  if (ordem.status === "em_diagnostico" || ordem.status === "orcamento_enviado") return "orcamento";
  return "historico";
}

export default async function DetalheDaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ordem, equipe, usuario] = await Promise.all([
    chamarApi<Ordem>(`/api/ordens/${id}/`),
    chamarApi<Usuario[]>("/api/equipe/"),
    usuarioAtual(),
  ]);

  const base = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";
  const linkDoCliente = `${base}/os/${ordem.token_publico}`;
  const fuso = fusoDaAssistencia(usuario);

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/ordens", rotulo: "Ordens de serviço" }}
        titulo={`OS #${ordem.numero}`}
        junto={<Selo status={ordem.status} rotulo={ordem.status_label} />}
        descricao={`${ordem.aparelho_descricao} · ${ordem.cliente_nome} · aberta em ${diaEHora(ordem.criado_em, fuso)}`}
        acoes={
          <>
            <a
              href={`/ordens/${ordem.id}/documentos/comprovante`}
              target="_blank"
              rel="noopener"
              data-tour="documentos"
              className={botao("secundario", "sm")}
            >
              <FileTextIcon size={15} />
              Comprovante
            </a>
            {STATUS_COM_RECIBO.includes(ordem.status) && (
              <a
                href={`/ordens/${ordem.id}/documentos/recibo`}
                target="_blank"
                rel="noopener"
                className={botao("secundario", "sm")}
              >
                <ReceiptIcon size={15} />
                Recibo
              </a>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] lg:items-start">
        <PainelDaEtapa
          ordem={ordem}
          linkDoCliente={linkDoCliente}
          className="min-w-0 lg:col-start-1 lg:row-start-1"
        />

        <FichaDaOrdem
          ordem={ordem}
          equipe={equipe}
          linkDoCliente={linkDoCliente}
          podeVerSenha={podeVerSenha(usuario)}
          hoje={hojeEmIso(fuso)}
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        <Abas
          tour="abas"
          inicial={abaInicial(ordem)}
          className="min-w-0 lg:col-start-1 lg:row-start-2"
          abas={[
            {
              id: "historico",
              rotulo: "Histórico",
              icone: <ClockCounterClockwiseIcon size={17} />,
              conteudo: <HistoricoDaOrdem ordem={ordem} fuso={fuso} />,
            },
            {
              id: "orcamento",
              rotulo: "Orçamento",
              icone: <ReceiptIcon size={17} />,
              contagem: ordem.itens.length,
              conteudo: (
                <>
                  <OrcamentoDaOrdem ordem={ordem} />
                  <PagamentoDaOrdem ordem={ordem} podeRemover={gerenciaEquipe(usuario)} fuso={fuso} />
                </>
              ),
            },
            {
              id: "fotos",
              rotulo: "Fotos",
              icone: <CameraIcon size={17} />,
              contagem: ordem.fotos.length,
              conteudo: (
                <FotosDaOrdem id={ordem.id} fotos={ordem.fotos} podeApagar={podeApagar(usuario)} />
              ),
            },
            {
              id: "anotacoes",
              rotulo: "Anotações",
              icone: <NotePencilIcon size={17} />,
              conteudo: <AnotacoesDoReparo ordem={ordem} />,
            },
          ]}
        />
      </div>

      <Tour nome="ordem" />
    </>
  );
}
