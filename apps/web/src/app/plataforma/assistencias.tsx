import { MessageCircle, Store } from "lucide-react";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Secao } from "@/componentes/ui/Secao";
import { Selo } from "@/componentes/ui/Selo";
import { botao } from "@/componentes/ui/estilos";
import { dataCurta } from "@/lib/datas";
import { contagem, haDias } from "@/lib/formatos";
import { formatarTelefone } from "@/lib/telefone";
import type { LinhaDaAssistencia } from "@/lib/tipos";
import { linkDoWhatsApp } from "@/lib/whatsapp";

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}

function mensagemPara(linha: LinhaDaAssistencia, quemFala: string): string {
  const saudacao = linha.dono ? `Olá, ${primeiroNome(linha.dono)}!` : "Olá!";
  const apresentacao = `${saudacao} Aqui é ${quemFala}, do Bancada.`;

  if (linha.alerta === "sem_ordens") {
    return `${apresentacao} Vi que a ${linha.nome} se cadastrou e ainda não abriu nenhuma ordem de serviço. Posso ajudar com a primeira?`;
  }
  if (linha.alerta === "parou") {
    return `${apresentacao} Faz alguns dias que a ${linha.nome} não abre ordem no Bancada. Aconteceu alguma coisa? Posso ajudar?`;
  }
  return `${apresentacao} Tudo certo com o Bancada por aí?`;
}

function textoDoAlerta(linha: LinhaDaAssistencia): string {
  if (linha.alerta === "sem_ordens") return "Não abriu nenhuma ordem";
  return `Sem ordem nova ${haDias(linha.dias_sem_ordem ?? 0)}`;
}

function movimento(linha: LinhaDaAssistencia, nomeDoMes: string): string {
  const partes = [
    `cadastro em ${dataCurta(linha.cadastro)}`,
    `${contagem(linha.ordens_no_mes, "ordem", "ordens")} em ${nomeDoMes}, ${linha.ordens_no_total} no total`,
  ];
  if (linha.dias_sem_ordem !== null) partes.push(`última ordem ${haDias(linha.dias_sem_ordem)}`);
  partes.push(
    linha.dias_sem_acesso === null
      ? "nenhum acesso registrado"
      : `último acesso ${haDias(linha.dias_sem_acesso)}`,
  );
  return partes.join(" · ");
}

function Linha({
  linha,
  nomeDoMes,
  quemFala,
}: {
  linha: LinhaDaAssistencia;
  nomeDoMes: string;
  quemFala: string;
}) {
  const conversa = linkDoWhatsApp(linha.whatsapp, mensagemPara(linha, quemFala));
  const contato = [linha.dono, linha.email, linha.whatsapp && formatarTelefone(linha.whatsapp)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-full space-y-1 sm:basis-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{linha.nome}</p>
          {linha.situacao && <Selo status={linha.situacao} rotulo={linha.situacao_rotulo} />}
          {linha.alerta && <Selo status={linha.alerta} rotulo={textoDoAlerta(linha)} />}
        </div>
        {contato && <p className="text-[13px] break-words text-texto-suave">{contato}</p>}
        <p className="text-xs text-texto-apagado first-letter:uppercase">
          {movimento(linha, nomeDoMes)}
        </p>
      </div>
      {conversa && (
        <a
          href={conversa}
          target="_blank"
          rel="noopener noreferrer"
          className={botao(linha.alerta ? "primario" : "secundario", "sm")}
        >
          <MessageCircle size={14} strokeWidth={2} />
          WhatsApp
          <span className="sr-only"> de {linha.dono || linha.nome}</span>
        </a>
      )}
    </li>
  );
}

export function SecaoAssistencias({
  assistencias,
  nomeDoMes,
  quemFala,
}: {
  assistencias: LinhaDaAssistencia[];
  nomeDoMes: string;
  quemFala: string;
}) {
  const pedemContato = assistencias.filter((linha) => linha.alerta).length;
  const resumo = `${contagem(assistencias.length, "cadastrada", "cadastradas")}, ${contagem(pedemContato, "pede contato", "pedem contato")}. Vêm primeiro as que não abriram nenhuma ordem 3 dias depois do cadastro e as que estão há 14 dias sem ordem nova.`;

  return (
    <Secao titulo="Assistências" descricao={resumo}>
      <Cartao semEspaco>
        {assistencias.length > 0 ? (
          <ul className="divide-y divide-borda">
            {assistencias.map((linha) => (
              <Linha key={linha.id} linha={linha} nomeDoMes={nomeDoMes} quemFala={quemFala} />
            ))}
          </ul>
        ) : (
          <EstadoVazio
            icone={<Store size={18} strokeWidth={1.75} />}
            titulo="Nenhuma assistência cadastrada ainda"
            descricao="Cada cadastro novo aparece aqui, e um e-mail avisa você na hora."
          />
        )}
      </Cartao>
    </Secao>
  );
}
