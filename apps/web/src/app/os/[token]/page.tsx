import type { Metadata } from "next";
import Image from "next/image";
import { CabecalhoDaLoja } from "@/componentes/CabecalhoDaLoja";
import { ProgressoDoReparo } from "@/componentes/ProgressoDoReparo";
import {
  CalendarCheckIcon,
  CameraIcon,
  ClockCounterClockwiseIcon,
  CloudSlashIcon,
  HourglassLowIcon,
  LinkBreakIcon,
  PhoneIcon,
  ReceiptIcon,
  WhatsappLogoIcon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { LinhaDoTempo } from "@/componentes/ui/LinhaDoTempo";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { FUSO_HORARIO, diaPorExtenso, hojeEmIso } from "@/lib/datas";
import { enderecoDaFoto } from "@/lib/fotos";
import { enderecoDaLogo } from "@/lib/logo";
import { emReais } from "@/lib/moeda";
import {
  buscarAcompanhamento,
  nomeParaOCliente,
  type AcompanhamentoPublico,
  type FotoPublica,
} from "@/lib/publico";
import { formatarTelefone } from "@/lib/telefone";
import { linkDoWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const STATUS_COM_PREVISAO = [
  "recebido",
  "em_diagnostico",
  "orcamento_enviado",
  "aprovado",
  "em_reparo",
  "aguardando_peca",
];

const STATUS_COM_CONTATO_NO_TOPO = ["orcamento_enviado", "pronto"];

const DIGITOS_DE_CELULAR = 11;

const ENDERECO_PUBLICO = process.env.APP_PUBLIC_URL ?? "http://localhost:3000";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo !== "ok") {
    return { title: "Acompanhamento · Bancada" };
  }

  const { dados } = resultado;
  const { logo } = dados.assistencia;
  return {
    title: `${dados.aparelho} · ${dados.status_rotulo}`,
    description: dados.mensagem,
    openGraph: {
      title: nomeParaOCliente(dados.assistencia),
      description: `${dados.aparelho} · ${dados.status_rotulo}. ${dados.mensagem}`,
      siteName: dados.assistencia.nome,
      type: "website",
      images: logo
        ? [
            {
              url: `${ENDERECO_PUBLICO}${enderecoDaLogo(logo.assinatura)}`,
              width: logo.largura,
              height: logo.altura,
              alt: dados.assistencia.nome,
            },
          ]
        : undefined,
    },
  };
}

function formatarMomento(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_HORARIO,
  });
}

function Aviso({
  icone,
  titulo,
  texto,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="text-icone">{icone}</span>
        <h1 className="mt-4 text-xl leading-tight font-bold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-[15px] text-texto-apagado">{texto}</p>
      </div>
    </main>
  );
}

function Foto({ foto }: { foto: FotoPublica }) {
  return (
    <figure className="space-y-1.5">
      <Image
        src={enderecoDaFoto(foto.assinatura)}
        alt={foto.legenda || `Foto do aparelho ${foto.momento_rotulo.toLowerCase()}`}
        width={foto.largura}
        height={foto.altura}
        unoptimized
        className="aspect-[4/3] w-full rounded-xl border border-borda object-cover"
      />
      <figcaption className="text-[13px] text-texto-apagado">
        {foto.momento_rotulo}
        {foto.legenda && ` · ${foto.legenda}`}
      </figcaption>
    </figure>
  );
}

function Situacao({ dados }: { dados: AcompanhamentoPublico }) {
  const previsao =
    dados.prometida_para &&
    dados.prometida_para >= hojeEmIso() &&
    STATUS_COM_PREVISAO.includes(dados.status)
      ? dados.prometida_para
      : null;

  return (
    <section className="space-y-6 rounded-3xl border border-borda bg-superficie p-5 shadow-cartao sm:p-6">
      <div className="space-y-3">
        <Selo status={dados.status} rotulo={dados.status_rotulo} />
        <p className="text-xl leading-snug font-bold tracking-tight">{dados.mensagem}</p>
      </div>

      <ProgressoDoReparo status={dados.status} />

      {previsao && (
        <p className="flex items-center gap-3 rounded-2xl bg-realce px-4 py-3 text-sm">
          <CalendarCheckIcon size={20} className="shrink-0 text-icone" />
          <span>
            Previsão de entrega: <strong className="font-semibold">{diaPorExtenso(previsao)}</strong>
          </span>
        </p>
      )}
    </section>
  );
}

function chamadaDoContato(status: string): string {
  if (status === "orcamento_enviado") {
    return "Para aprovar ou recusar o orçamento, fale com a assistência.";
  }
  if (status === "pronto") return "Combine a retirada com a assistência.";
  return "Ficou com alguma dúvida sobre o reparo?";
}

function Contato({ dados, chamada }: { dados: AcompanhamentoPublico; chamada: string }) {
  const telefone = dados.assistencia.telefone;
  if (!telefone) return null;

  const celular = telefone.replace(/\D/g, "").length === DIGITOS_DE_CELULAR;
  const mensagem = `Olá! Sou ${dados.cliente_primeiro_nome}, da ordem de serviço nº ${dados.numero} (${dados.aparelho}).`;
  const whatsapp = celular ? linkDoWhatsApp(telefone, mensagem) : null;

  return (
    <section className="rounded-3xl border border-borda bg-superficie p-5 shadow-cartao sm:p-6">
      <p className="text-[15px] font-bold">{chamada}</p>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-texto-apagado">
        <PhoneIcon size={15} className="shrink-0" />
        {nomeParaOCliente(dados.assistencia)} · {formatarTelefone(telefone)}
      </p>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className={botao("primario")}>
            <WhatsappLogoIcon size={17} />
            Conversar no WhatsApp
          </a>
        )}
        <a href={`tel:${telefone}`} className={botao(whatsapp ? "secundario" : "primario")}>
          <PhoneIcon size={17} />
          Ligar para a assistência
        </a>
      </div>
    </section>
  );
}

function Orcamento({ orcamento }: { orcamento: NonNullable<AcompanhamentoPublico["orcamento"]> }) {
  return (
    <Cartao titulo={orcamento.aprovado ? "Orçamento aprovado" : "Orçamento"} icone={ReceiptIcon} semEspaco>
      <ul className="divide-y divide-borda">
        {orcamento.itens.map((item, indice) => (
          <li key={indice} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px]">
            <span className="font-medium">{item.descricao}</span>
            <span className="shrink-0 font-semibold text-dinheiro tabular-nums">{emReais(item.valor)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-borda bg-realce px-5 py-4 text-base font-bold">
        <span>Total</span>
        <span className="text-dinheiro tabular-nums">{emReais(orcamento.total)}</span>
      </div>
    </Cartao>
  );
}

export default async function Acompanhamento({ params }: Props) {
  const { token } = await params;
  const resultado = await buscarAcompanhamento(token);

  if (resultado.tipo === "inexistente") {
    return (
      <Aviso
        icone={<LinkBreakIcon size={44} weight="light" />}
        titulo="Link não encontrado"
        texto="Confira se o endereço foi copiado por inteiro, ou fale com a assistência."
      />
    );
  }

  if (resultado.tipo === "expirado") {
    return (
      <Aviso
        icone={<HourglassLowIcon size={44} weight="light" />}
        titulo="Link expirado"
        texto="Este acompanhamento não está mais disponível. Fale com a assistência se precisar."
      />
    );
  }

  if (resultado.tipo === "indisponivel") {
    return (
      <Aviso
        icone={<CloudSlashIcon size={44} weight="light" />}
        titulo="Serviço indisponível"
        texto="Não conseguimos carregar o acompanhamento agora. Tente novamente em instantes."
      />
    );
  }

  const { dados } = resultado;
  const ultima = dados.linha_do_tempo.length - 1;
  const contatoNoTopo = STATUS_COM_CONTATO_NO_TOPO.includes(dados.status);
  const chamada = chamadaDoContato(dados.status);

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8 sm:py-12">
      <header className="space-y-6">
        <CabecalhoDaLoja
          nome={nomeParaOCliente(dados.assistencia)}
          detalhe={`Ordem de serviço nº ${dados.numero}`}
          logo={dados.assistencia.logo}
        />
        <div className="space-y-1">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">
            Olá, {dados.cliente_primeiro_nome}!
          </h1>
          <p className="text-[15px] text-texto-apagado">
            Aqui você acompanha o reparo do seu {dados.aparelho}.
          </p>
        </div>
      </header>

      <Situacao dados={dados} />

      {dados.orcamento && <Orcamento orcamento={dados.orcamento} />}

      {contatoNoTopo && <Contato dados={dados} chamada={chamada} />}

      {dados.fotos.length > 0 && (
        <Cartao titulo="Fotos do aparelho" icone={CameraIcon}>
          <div className="grid grid-cols-2 gap-3">
            {dados.fotos.map((foto) => (
              <Foto key={foto.assinatura} foto={foto} />
            ))}
          </div>
        </Cartao>
      )}

      <Cartao titulo="Andamento" icone={ClockCounterClockwiseIcon}>
        <LinhaDoTempo
          etapas={dados.linha_do_tempo.map((etapa, indice) => ({
            chave: `${etapa.status}-${etapa.em}`,
            status: etapa.status,
            titulo: etapa.rotulo,
            detalhes: formatarMomento(etapa.em),
            atual: indice === ultima,
          }))}
        />
      </Cartao>

      {!contatoNoTopo && <Contato dados={dados} chamada={chamada} />}

      <footer className="pt-2 text-center text-[13px] text-texto-apagado">
        Aberta em {formatarMomento(dados.aberta_em)}
      </footer>
    </main>
  );
}
