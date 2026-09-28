import Link from "next/link";
import { BarrasHorizontais } from "@/componentes/BarrasHorizontais";
import { Cartao } from "@/componentes/ui/Cartao";
import type { Painel } from "@/lib/tipos";
import { contagem } from "./formatos";
import { Secao } from "./secao";

type Atendimento = Painel["atendimento"];

function Vazio() {
  return (
    <p className="px-5 py-6 text-center text-[13px] text-texto-suave">
      Nenhuma ordem aberta no período.
    </p>
  );
}

function Aparelhos({ aparelhos }: { aparelhos: Atendimento["aparelhos"] }) {
  return (
    <Cartao titulo="Aparelhos mais atendidos" semEspaco>
      {aparelhos.length === 0 ? (
        <Vazio />
      ) : (
        <BarrasHorizontais
          empilhada
          linhas={aparelhos.map((aparelho) => ({
            chave: `${aparelho.marca}-${aparelho.modelo}`,
            rotulo: `${aparelho.marca} ${aparelho.modelo}`,
            medida: aparelho.total,
            valor: String(aparelho.total),
          }))}
        />
      )}
    </Cartao>
  );
}

function Defeitos({ defeitos }: { defeitos: Atendimento["defeitos"] }) {
  return (
    <Cartao
      titulo="Defeitos mais comuns"
      descricao="Pelas palavras do problema relatado. Uma ordem pode contar em mais de um."
      semEspaco
    >
      {defeitos.length === 0 ? (
        <Vazio />
      ) : (
        <BarrasHorizontais
          empilhada
          linhas={defeitos.map((linha) => ({
            chave: linha.defeito,
            rotulo: linha.defeito,
            medida: linha.total,
            valor: String(linha.total),
          }))}
        />
      )}
    </Cartao>
  );
}

function resumoDosClientes(clientes: Atendimento["clientes"]): string | undefined {
  if (clientes.atendidos === 0) return undefined;
  const atendidos = contagem(clientes.atendidos, "cliente atendido", "clientes atendidos");
  return `${clientes.que_voltaram} de ${atendidos} no período já tinham vindo antes.`;
}

function Clientes({ clientes }: { clientes: Atendimento["clientes"] }) {
  const resumo = resumoDosClientes(clientes);

  return (
    <Cartao titulo="Clientes que voltam" descricao={resumo} semEspaco>
      {clientes.mais_frequentes.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-texto-suave">
          {clientes.atendidos === 0
            ? "Nenhuma ordem aberta no período."
            : "Nenhum cliente do período tinha vindo antes."}
        </p>
      ) : (
        <ul className="divide-y divide-borda">
          {clientes.mais_frequentes.map((cliente) => (
            <li key={cliente.telefone}>
              <Link
                href={`/ordens?busca=${cliente.telefone}`}
                className="flex items-center justify-between gap-4 px-5 py-2.5 transition-colors hover:bg-realce"
              >
                <span className="min-w-0 truncate text-sm">{cliente.nome}</span>
                <span className="shrink-0 text-sm text-texto-suave tabular-nums">
                  {contagem(cliente.ordens, "ordem", "ordens")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

export function SecaoAtendimento({ atendimento }: { atendimento: Atendimento }) {
  return (
    <Secao
      titulo="Atendimento"
      descricao="Quem chegou ao balcão no período e com qual problema."
      tour="atendimento"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Aparelhos aparelhos={atendimento.aparelhos} />
        <Defeitos defeitos={atendimento.defeitos} />
        <Clientes clientes={atendimento.clientes} />
      </div>
    </Secao>
  );
}
