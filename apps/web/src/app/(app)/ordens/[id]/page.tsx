import { FileText, Lock, Mail, Receipt } from "lucide-react";
import { CompartilharLink } from "@/componentes/CompartilharLink";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { LinhaDoTempo } from "@/componentes/ui/LinhaDoTempo";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { chamarApi } from "@/lib/api";
import type { Ordem, Usuario } from "@/lib/tipos";
import { podeApagar, podeVerSenha, usuarioAtual } from "@/lib/usuario";
import { AcoesDeStatus } from "./acoesDeStatus";
import { DetalhesDoReparo } from "./detalhesDoReparo";
import { FotosDaOrdem } from "./fotosDaOrdem";
import { SenhaDoAparelho } from "./senhaDoAparelho";

export const dynamic = "force-dynamic";

const STATUS_COM_RECIBO = ["pronto", "entregue", "devolvido_sem_reparo"];

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarMomento(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDia(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Propriedade({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[13px] text-texto-suave">{rotulo}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium">{children}</dd>
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
              className={botao("secundario", "sm")}
            >
              <FileText size={14} strokeWidth={2} />
              Comprovante
            </a>
            {STATUS_COM_RECIBO.includes(ordem.status) && (
              <a
                href={`/ordens/${ordem.id}/documentos/recibo`}
                target="_blank"
                rel="noopener"
                className={botao("secundario", "sm")}
              >
                <Receipt size={14} strokeWidth={2} />
                Recibo
              </a>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Cartao titulo="Problema relatado">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{ordem.problema_relatado}</p>
          </Cartao>

          {ordem.itens.length > 0 && (
            <Cartao titulo="Orçamento" semEspaco>
              <ul className="divide-y divide-borda">
                {ordem.itens.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{item.descricao}</span>
                      <span className="text-xs text-texto-suave">
                        {item.tipo === "peca" ? "Peça" : "Serviço"}
                        {item.aprovado && " · aprovado"}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">{MOEDA.format(Number(item.valor))}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-borda bg-realce px-5 py-2.5 text-sm font-medium">
                <span>Total</span>
                <span className="tabular-nums">{MOEDA.format(Number(ordem.total_orcamento))}</span>
              </div>
            </Cartao>
          )}

          <Cartao titulo="Detalhes do reparo">
            <DetalhesDoReparo ordem={ordem} equipe={equipe} />
          </Cartao>

          <FotosDaOrdem id={ordem.id} fotos={ordem.fotos} podeApagar={podeApagar(usuario)} />

          <Cartao titulo="Histórico" descricao="Cada mudança de status fica registrada e não pode ser apagada.">
            <LinhaDoTempo
              etapas={ordem.eventos.map((evento, indice) => ({
                chave: evento.id,
                status: evento.para_status,
                atual: indice === ultimoEvento,
                titulo: evento.de_status ? (
                  <>
                    <span className="text-texto-suave">{evento.de_label} → </span>
                    {evento.para_label}
                  </>
                ) : (
                  evento.para_label
                ),
                detalhes: [formatarMomento(evento.criado_em), evento.usuario, evento.nota]
                  .filter(Boolean)
                  .join(" · "),
                complemento: evento.aviso && (
                  <p className="flex items-center gap-1.5 pt-0.5 text-xs text-texto-suave">
                    <Mail size={12} strokeWidth={2} />
                    Cliente avisado em {evento.aviso.destino}
                  </p>
                ),
              }))}
            />
          </Cartao>
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Cartao titulo="Mudar status">
            <AcoesDeStatus id={ordem.id} transicoes={ordem.transicoes_possiveis} />
          </Cartao>

          <Cartao titulo="Propriedades">
            <dl className="-my-2 divide-y divide-borda">
              <Propriedade rotulo="Cliente">{ordem.cliente_nome}</Propriedade>
              <Propriedade rotulo="Aparelho">{ordem.aparelho_descricao}</Propriedade>
              <Propriedade rotulo="IMEI">
                <span className="font-mono">{ordem.imei_mascarado || "—"}</span>
              </Propriedade>
              <Propriedade rotulo="Técnico">{ordem.tecnico_nome ?? "—"}</Propriedade>
              <Propriedade rotulo="Prazo">
                {ordem.prometida_para ? formatarDia(ordem.prometida_para) : "—"}
              </Propriedade>
              <Propriedade rotulo="Orçamento">
                <span className="tabular-nums">{MOEDA.format(Number(ordem.total_orcamento))}</span>
              </Propriedade>
            </dl>
          </Cartao>

          <Cartao
            titulo={
              <span className="flex items-center gap-1.5">
                <Lock size={13} strokeWidth={2} className="text-texto-suave" />
                Senha de desbloqueio
              </span>
            }
          >
            {podeVerSenha(usuario) ? (
              <SenhaDoAparelho aparelho={ordem.aparelho} />
            ) : (
              <p className="text-[13px] text-texto-suave">
                Só técnicos e o dono podem ver a senha de desbloqueio.
              </p>
            )}
          </Cartao>

          <Cartao titulo="Link do cliente" descricao="O cliente acompanha o reparo sem criar conta.">
            <CompartilharLink
              url={linkDoCliente}
              aparelho={ordem.aparelho_descricao}
              cliente={ordem.cliente_nome.split(" ")[0]}
            />
          </Cartao>
        </aside>
      </div>
    </>
  );
}
