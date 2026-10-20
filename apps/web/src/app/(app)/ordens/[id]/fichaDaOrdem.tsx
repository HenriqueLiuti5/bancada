import Link from "next/link";
import { CompartilharLink } from "@/componentes/CompartilharLink";
import {
  CalendarDotsIcon,
  ChatTextIcon,
  DeviceMobileIcon,
  InfoIcon,
  LinkSimpleIcon,
  MapPinIcon,
  PasswordIcon,
  PencilSimpleIcon,
  UserIcon,
  WrenchIcon,
  type Icon,
} from "@/componentes/icones";
import { PrazoDaOrdem } from "@/componentes/PrazoDaOrdem";
import { botao, juntar } from "@/componentes/ui/estilos";
import { formatarTelefone } from "@/lib/telefone";
import type { Ordem, Usuario } from "@/lib/tipos";
import { linkDoWhatsApp } from "@/lib/whatsapp";
import { registrarLinkCompartilhado } from "../../acoes";
import { AvisoNoWhatsApp } from "./avisoNoWhatsApp";
import { PrazoPrometido, TecnicoDaOrdem } from "./campoDaFicha";
import { SenhaDoAparelho } from "./senhaDoAparelho";

function Dado({
  rotulo,
  icone: Icone,
  tour,
  children,
}: {
  rotulo: string;
  icone: Icon;
  tour?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-tour={tour} className="space-y-1.5 px-5 py-4">
      <dt className="flex items-center gap-2 text-[13px] font-medium text-texto-apagado sm:text-xs">
        <Icone size={15} className="shrink-0" />
        {rotulo}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

type Props = {
  ordem: Ordem;
  equipe: Usuario[];
  linkDoCliente: string;
  podeVerSenha: boolean;
  hoje: string;
  className?: string;
};

export function FichaDaOrdem({ ordem, equipe, linkDoCliente, podeVerSenha, hoje, className }: Props) {
  const mensagem = `Olá, ${ordem.cliente_nome.split(" ")[0]}! Acompanhe o reparo do seu ${ordem.aparelho_descricao} por aqui: ${linkDoCliente}`;
  const conversa =
    linkDoWhatsApp(ordem.cliente_telefone, mensagem) ??
    `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  const pessoas = equipe.map((pessoa) => ({
    valor: String(pessoa.id),
    rotulo: pessoa.first_name || pessoa.username,
  }));

  return (
    <aside
      data-tour="ficha"
      className={juntar(
        "overflow-hidden rounded-2xl border border-borda bg-superficie shadow-cartao",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4 border-b border-borda px-5 py-4">
        <h2 className="flex items-center gap-2.5 text-[15px] leading-snug font-semibold">
          <InfoIcon size={20} className="shrink-0 text-icone" />
          Dados da ordem
        </h2>
        <Link
          href={`/ordens/${ordem.id}/cliente`}
          aria-label="Editar cliente e aparelho"
          className={botao("fantasma", "sm")}
        >
          <PencilSimpleIcon size={15} />
          Editar
        </Link>
      </header>

      <dl className="divide-y divide-borda">
        <Dado rotulo="Cliente" icone={UserIcon}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block font-semibold">{ordem.cliente_nome}</span>
              {ordem.cliente_telefone && (
                <span className="block text-texto-suave tabular-nums">
                  {formatarTelefone(ordem.cliente_telefone)}
                </span>
              )}
            </span>
            <AvisoNoWhatsApp id={ordem.id} link={conversa} rotulo="WhatsApp" tamanho="sm" />
          </div>
        </Dado>

        <Dado rotulo="Aparelho" icone={DeviceMobileIcon}>
          <p className="font-semibold">{ordem.aparelho_descricao}</p>
          <p className="mt-0.5 text-texto-suave tabular-nums">
            IMEI {ordem.imei_mascarado || "não informado"}
          </p>
        </Dado>

        <Dado rotulo="Defeito relatado" icone={ChatTextIcon}>
          <p className="leading-relaxed whitespace-pre-wrap">{ordem.problema_relatado}</p>
        </Dado>

        {ordem.loja_nome && (
          <Dado rotulo="Loja" icone={MapPinIcon}>
            <p>{ordem.loja_nome}</p>
          </Dado>
        )}

        <Dado rotulo="Técnico" icone={WrenchIcon}>
          <TecnicoDaOrdem id={ordem.id} tecnico={ordem.tecnico} equipe={pessoas} />
        </Dado>

        <Dado rotulo="Prazo prometido" icone={CalendarDotsIcon}>
          <PrazoPrometido id={ordem.id} prazo={ordem.prometida_para} />
          <PrazoDaOrdem
            prazo={ordem.prometida_para}
            hoje={hoje}
            encerrada={ordem.encerrada}
            frase
            className="mt-2 text-[13px] text-texto-suave sm:text-xs"
          />
        </Dado>

        <Dado rotulo="Senha de desbloqueio" icone={PasswordIcon} tour="senha">
          {podeVerSenha ? (
            <SenhaDoAparelho aparelho={ordem.aparelho} podeCorrigir={!ordem.encerrada} />
          ) : (
            <p className="text-texto-apagado">Só técnicos e o dono podem ver a senha.</p>
          )}
        </Dado>

        <Dado rotulo="Link do cliente" icone={LinkSimpleIcon} tour="link-do-cliente">
          <CompartilharLink
            url={linkDoCliente}
            aoCompartilhar={registrarLinkCompartilhado.bind(null, ordem.id)}
            rotuloDaPrevia="Ver como o cliente vê"
          />
        </Dado>
      </dl>
    </aside>
  );
}
