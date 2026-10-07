import { CompartilharLink } from "@/componentes/CompartilharLink";
import {
  ArrowsLeftRightIcon,
  CalendarDotsIcon,
  ChatTextIcon,
  ClockCounterClockwiseIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  HashIcon,
  InfoIcon,
  LinkSimpleIcon,
  NotePencilIcon,
  PackageIcon,
  PasswordIcon,
  ReceiptIcon,
  UserIcon,
  WrenchIcon,
  type Icon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { LinhaDoTempo } from "@/componentes/ui/LinhaDoTempo";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { FUSO_HORARIO } from "@/lib/datas";
import { emReais } from "@/lib/moeda";
import type { Ordem, Usuario } from "@/lib/tipos";
import { gerenciaEquipe, podeApagar, podeVerSenha, usuarioAtual } from "@/lib/usuario";
import { registrarLinkCompartilhado } from "../../acoes";
import { Tour } from "../../tour";
import { AcoesDeStatus } from "./acoesDeStatus";
import { DetalhesDoReparo } from "./detalhesDoReparo";
import { FotosDaOrdem } from "./fotosDaOrdem";
import { OrcamentoDaOrdem } from "./orcamentoDaOrdem";
import { PagamentoDaOrdem } from "./pagamentoDaOrdem";
import { SenhaDoAparelho } from "./senhaDoAparelho";

export const dynamic = "force-dynamic";

const STATUS_COM_RECIBO = ["pronto", "entregue", "devolvido_sem_reparo"];

function formatarMomento(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_HORARIO,
  });
}

function formatarDia(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: FUSO_HORARIO,
  });
}

function Propriedade({
  rotulo,
  icone: Icone,
  children,
}: {
  rotulo: string;
  icone: Icon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="flex items-center gap-2.5 text-sm text-texto-apagado sm:text-[13px]">
        <Icone size={16} className="shrink-0" />
        {rotulo}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm font-semibold sm:text-[13px]">{children}</dd>
    </div>
  );
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
  const ultimoEvento = ordem.eventos.length - 1;
  const podeEntregar = ordem.transicoes_possiveis.some((transicao) => transicao.valor === "entregue");

  return (
    <>
      <CabecalhoDaPagina
        voltar={{ href: "/ordens", rotulo: "Ordens de serviço" }}
        titulo={`OS #${ordem.numero}`}
        junto={<Selo status={ordem.status} rotulo={ordem.status_label} />}
        descricao={`${ordem.aparelho_descricao} · ${ordem.cliente_nome} · aberta em ${formatarMomento(ordem.criado_em)}`}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Cartao titulo="Problema relatado" icone={ChatTextIcon}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{ordem.problema_relatado}</p>
          </Cartao>

          <OrcamentoDaOrdem ordem={ordem} />

          <PagamentoDaOrdem ordem={ordem} podeRemover={gerenciaEquipe(usuario)} />

          <Cartao titulo="Detalhes do reparo" icone={NotePencilIcon}>
            <DetalhesDoReparo ordem={ordem} equipe={equipe} />
          </Cartao>

          <FotosDaOrdem id={ordem.id} fotos={ordem.fotos} podeApagar={podeApagar(usuario)} />

          <Cartao
            tour="historico"
            titulo="Histórico"
            icone={ClockCounterClockwiseIcon}
            descricao="Cada mudança de status fica registrada e não pode ser apagada."
          >
            <LinhaDoTempo
              etapas={ordem.eventos.map((evento, indice) => ({
                chave: evento.id,
                status: evento.para_status,
                atual: indice === ultimoEvento,
                titulo: evento.de_status ? (
                  <>
                    <span className="font-medium text-texto-apagado">{evento.de_label} → </span>
                    {evento.para_label}
                  </>
                ) : (
                  evento.para_label
                ),
                detalhes: [formatarMomento(evento.criado_em), evento.usuario, evento.nota]
                  .filter(Boolean)
                  .join(" · "),
                complemento: evento.aviso && (
                  <p className="flex items-center gap-1.5 pt-1 text-[13px] text-texto-apagado sm:text-xs">
                    <EnvelopeSimpleIcon size={14} className="text-destaque" />
                    Cliente avisado em {evento.aviso.destino}
                  </p>
                ),
              }))}
            />
          </Cartao>
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Cartao
            tour="mudar-status"
            titulo={podeEntregar ? "Entregar ao cliente" : "Mudar status"}
            icone={podeEntregar ? PackageIcon : ArrowsLeftRightIcon}
          >
            <AcoesDeStatus
              id={ordem.id}
              transicoes={ordem.transicoes_possiveis}
              itens={ordem.itens}
              totalAprovado={ordem.total_aprovado}
            />
          </Cartao>

          <Cartao titulo="Propriedades" icone={InfoIcon}>
            <dl className="-my-2.5 divide-y divide-borda">
              <Propriedade rotulo="Cliente" icone={UserIcon}>
                {ordem.cliente_nome}
              </Propriedade>
              <Propriedade rotulo="Aparelho" icone={DeviceMobileIcon}>
                {ordem.aparelho_descricao}
              </Propriedade>
              <Propriedade rotulo="IMEI" icone={HashIcon}>
                <span className="tabular-nums">{ordem.imei_mascarado || "—"}</span>
              </Propriedade>
              <Propriedade rotulo="Técnico" icone={WrenchIcon}>
                {ordem.tecnico_nome ?? "—"}
              </Propriedade>
              <Propriedade rotulo="Prazo" icone={CalendarDotsIcon}>
                {ordem.prometida_para ? formatarDia(ordem.prometida_para) : "—"}
              </Propriedade>
              <Propriedade
                rotulo={ordem.orcamento_aprovado ? "Aprovado" : "Orçamento"}
                icone={ReceiptIcon}
              >
                <span className="text-dinheiro tabular-nums">
                  {emReais(ordem.orcamento_aprovado ? ordem.total_aprovado : ordem.total_orcamento)}
                </span>
              </Propriedade>
            </dl>
          </Cartao>

          <Cartao tour="senha" titulo="Senha de desbloqueio" icone={PasswordIcon}>
            {podeVerSenha(usuario) ? (
              <SenhaDoAparelho aparelho={ordem.aparelho} />
            ) : (
              <p className="text-sm text-texto-apagado sm:text-[13px]">
                Só técnicos e o dono podem ver a senha de desbloqueio.
              </p>
            )}
          </Cartao>

          <Cartao
            tour="link-do-cliente"
            titulo="Link do cliente"
            icone={LinkSimpleIcon}
            descricao="O cliente acompanha o reparo sem criar conta."
          >
            <CompartilharLink
              url={linkDoCliente}
              aoCompartilhar={registrarLinkCompartilhado.bind(null, ordem.id)}
              mensagem={`Olá, ${ordem.cliente_nome.split(" ")[0]}! Acompanhe o reparo do seu ${ordem.aparelho_descricao} por aqui: ${linkDoCliente}`}
              rotuloDaPrevia="Ver como o cliente vê"
            />
          </Cartao>
        </aside>
      </div>

      <Tour nome="ordem" />
    </>
  );
}
