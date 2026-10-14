import Link from "next/link";
import { CompartilharLink } from "@/componentes/CompartilharLink";
import {
  CalendarDotsIcon,
  CameraIcon,
  ClockCounterClockwiseIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  HashIcon,
  InfoIcon,
  LinkSimpleIcon,
  NotePencilIcon,
  PasswordIcon,
  PencilSimpleIcon,
  ReceiptIcon,
  UserIcon,
  WrenchIcon,
  type Icon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { LinhaDoTempo } from "@/componentes/ui/LinhaDoTempo";
import { SecaoRecolhivel } from "@/componentes/ui/SecaoRecolhivel";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import { FUSO_HORARIO } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { Ordem, Usuario } from "@/lib/tipos";
import { gerenciaEquipe, podeApagar, podeVerSenha, usuarioAtual } from "@/lib/usuario";
import { registrarLinkCompartilhado } from "../../acoes";
import { Tour } from "../../tour";
import { DetalhesDoReparo } from "./detalhesDoReparo";
import { FotosDaOrdem } from "./fotosDaOrdem";
import { OrcamentoDaOrdem } from "./orcamentoDaOrdem";
import { PagamentoDaOrdem } from "./pagamentoDaOrdem";
import { ProximoPasso } from "./proximoPasso";
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
  const orcamentoForaDoPasso = ordem.status !== "em_diagnostico" && ordem.itens.length > 0;

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
          <ProximoPasso ordem={ordem} linkDoCliente={linkDoCliente} />

          {orcamentoForaDoPasso && <OrcamentoDaOrdem ordem={ordem} />}

          <PagamentoDaOrdem ordem={ordem} podeRemover={gerenciaEquipe(usuario)} />

          <div className="space-y-3">
            <div id="fotos" className="scroll-mt-20 lg:scroll-mt-6">
              <SecaoRecolhivel
                tour="fotos"
                titulo="Fotos do aparelho"
                icone={CameraIcon}
                resumo={ordem.fotos.length > 0 ? contagem(ordem.fotos.length, "foto", "fotos") : undefined}
                abertaDeInicio={ordem.status === "recebido"}
              >
                <FotosDaOrdem id={ordem.id} fotos={ordem.fotos} podeApagar={podeApagar(usuario)} />
              </SecaoRecolhivel>
            </div>

            <SecaoRecolhivel
              tour="detalhes"
              titulo="Anotações do reparo"
              icone={NotePencilIcon}
              resumo={ordem.tecnico_nome ? `Técnico: ${ordem.tecnico_nome}` : undefined}
            >
              <div className="p-5">
                <DetalhesDoReparo ordem={ordem} equipe={equipe} />
              </div>
            </SecaoRecolhivel>

            <SecaoRecolhivel
              tour="historico"
              titulo="Histórico"
              icone={ClockCounterClockwiseIcon}
              resumo={contagem(ordem.eventos.length, "registro", "registros")}
            >
              <div className="space-y-4 p-5">
                <p className="text-[13px] text-texto-apagado">
                  Cada mudança fica registrada com quem fez e quando, e não pode ser apagada.
                </p>
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
              </div>
            </SecaoRecolhivel>
          </div>
        </div>

        <aside className="space-y-6">
          <Cartao
            titulo="Propriedades"
            icone={InfoIcon}
            acoes={
              <Link
                href={`/ordens/${ordem.id}/cliente`}
                aria-label="Editar cliente e aparelho"
                className={botao("fantasma", "sm")}
              >
                <PencilSimpleIcon size={15} />
                Editar
              </Link>
            }
          >
            <dl className="-mt-2.5 divide-y divide-borda">
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
              <div className="space-y-1 pt-3">
                <dt className="text-sm text-texto-apagado sm:text-[13px]">Problema relatado</dt>
                <dd className="text-sm leading-relaxed whitespace-pre-wrap sm:text-[13px]">
                  {ordem.problema_relatado}
                </dd>
              </div>
            </dl>
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

          <Cartao tour="senha" titulo="Senha de desbloqueio" icone={PasswordIcon}>
            {podeVerSenha(usuario) ? (
              <SenhaDoAparelho aparelho={ordem.aparelho} podeCorrigir={!ordem.encerrada} />
            ) : (
              <p className="text-sm text-texto-apagado sm:text-[13px]">
                Só técnicos e o dono podem ver a senha de desbloqueio.
              </p>
            )}
          </Cartao>
        </aside>
      </div>

      <Tour nome="ordem" />
    </>
  );
}
