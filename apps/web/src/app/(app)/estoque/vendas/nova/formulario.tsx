"use client";

import { useActionState, useRef, useState } from "react";
import { LinhaDePagamento, type LinhaPaga } from "@/componentes/LinhaDePagamento";
import { PlusIcon, XIcon } from "@/componentes/icones";
import { MarcaDeObrigatorio } from "@/componentes/ui/CampoRotulado";
import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao, botaoDeIcone, campo, juntar, seletor } from "@/componentes/ui/estilos";
import { useOpcaoPadrao } from "@/componentes/useOpcaoPadrao";
import {
  lerQuantidade,
  quantidadeNaLoja,
  rotuloDoProduto,
  totalDaVenda,
  type LinhaVendida,
} from "@/lib/estoque";
import { centavosEmReais, centavosParaCampo, emCentavos } from "@/lib/moeda";
import type { EscolhaDeProdutos, Loja, ProdutoParaEscolher } from "@/lib/tipos";
import { registrarVenda, type EstadoSimples } from "../../acoes";

const INICIAL: EstadoSimples = {};

type Props = { escolha: EscolhaDeProdutos; lojas: Loja[] };

function problemaDaVenda(
  linhas: LinhaVendida[],
  cobrado: number | null,
  total: number,
  pagas: LinhaPaga[],
  pago: number,
): string | null {
  const escolhidas = linhas.filter((linha) => linha.produto);
  if (escolhidas.length === 0) return "Escolha ao menos um produto.";
  if (escolhidas.some((linha) => !lerQuantidade(linha.quantidade))) {
    return "Escreva a quantidade de cada produto só com números.";
  }
  if (cobrado === null) return "Escreva o valor cobrado só com números, como 39,90.";
  if (cobrado > total) return "O valor cobrado não pode passar do total.";
  if (pagas.some((linha) => !emCentavos(linha.valor))) {
    return "Preencha o valor de cada forma de pagamento, ou tire a que sobrou.";
  }
  if (pago !== cobrado) {
    return `Os pagamentos somam ${centavosEmReais(pago)}, e o valor cobrado é ${centavosEmReais(cobrado)}.`;
  }
  return null;
}

function LinhaDoProduto({
  linha,
  produtos,
  quantidadeDe,
  podeTirar,
  aoMudar,
  aoTirar,
}: {
  linha: LinhaVendida;
  produtos: ProdutoParaEscolher[];
  quantidadeDe: (produto: ProdutoParaEscolher) => number;
  podeTirar: boolean;
  aoMudar: (mudanca: Partial<LinhaVendida>) => void;
  aoTirar: () => void;
}) {
  const escolha = useOpcaoPadrao(linha.produto);
  const acessorios = produtos.filter((produto) => produto.tipo === "acessorio");
  const pecas = produtos.filter((produto) => produto.tipo === "peca");
  const subtotal = totalDaVenda([linha], produtos);

  function opcoes(lista: ProdutoParaEscolher[]) {
    return lista.map((produto) => (
      <option key={produto.id} value={produto.id}>
        {rotuloDoProduto(produto, quantidadeDe(produto))}
      </option>
    ));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <select
        ref={escolha}
        name="produto"
        aria-label="Produto"
        value={linha.produto}
        onChange={(evento) => aoMudar({ produto: evento.target.value })}
        className={juntar(seletor, "min-w-0 basis-full sm:basis-auto sm:flex-1")}
      >
        <option value="">Escolha o produto</option>
        {acessorios.length > 0 && <optgroup label="Acessórios">{opcoes(acessorios)}</optgroup>}
        {pecas.length > 0 && <optgroup label="Peças">{opcoes(pecas)}</optgroup>}
      </select>
      <input
        name="quantidade"
        aria-label="Quantidade"
        inputMode="numeric"
        autoComplete="off"
        value={linha.quantidade}
        onChange={(evento) => aoMudar({ quantidade: evento.target.value })}
        className={juntar(campo, "w-20 text-center tabular-nums")}
      />
      <span className="min-w-24 flex-1 text-right text-sm font-semibold text-dinheiro tabular-nums sm:flex-none">
        {centavosEmReais(subtotal)}
      </span>
      {podeTirar ? (
        <button type="button" onClick={aoTirar} title="Tirar este produto" className={botaoDeIcone}>
          <XIcon size={16} />
          <span className="sr-only">Tirar este produto</span>
        </button>
      ) : (
        <span className="size-9 shrink-0 sm:size-8" />
      )}
    </div>
  );
}

// Os campos são controlados porque o total, o valor cobrado e o pagamento dependem uns dos outros.
// Enquanto ninguém mexe no pagamento, a primeira forma acompanha o valor cobrado.
export function NovaVenda({ escolha, lojas }: Props) {
  const [estado, acao, enviando] = useActionState(registrarVenda, INICIAL);
  const [loja, setLoja] = useState(lojas.length > 0 ? String(lojas[0].id) : "");
  const [linhas, setLinhas] = useState<LinhaVendida[]>([{ chave: 0, produto: "", quantidade: "1" }]);
  const [cobradoDigitado, setCobradoDigitado] = useState<string | null>(null);
  const [linhasPagas, setLinhasPagas] = useState<LinhaPaga[]>([{ chave: 0, forma: "pix", valor: "" }]);
  const [pagamentoAutomatico, setPagamentoAutomatico] = useState(true);
  const [observacao, setObservacao] = useState("");
  const proximaLinha = useRef(1);
  const proximoPagamento = useRef(1);
  const seletorDaLoja = useOpcaoPadrao(loja);

  const quantidadeDe = (produto: ProdutoParaEscolher) =>
    quantidadeNaLoja(produto, loja ? Number(loja) : null, escolha.varias_lojas);

  const total = totalDaVenda(linhas, escolha.produtos);
  const cobrado = cobradoDigitado ?? centavosParaCampo(total);
  const cobradoEmCentavos = emCentavos(cobrado);
  const pagas = pagamentoAutomatico
    ? cobradoEmCentavos
      ? linhasPagas.slice(0, 1).map((linha) => ({ ...linha, valor: cobrado }))
      : []
    : linhasPagas;
  const pago = pagas.reduce((soma, linha) => soma + (emCentavos(linha.valor) ?? 0), 0);
  const desconto = cobradoEmCentavos === null ? 0 : total - cobradoEmCentavos;
  const problema = problemaDaVenda(linhas, cobradoEmCentavos, total, pagas, pago);
  const comecou = linhas.some((linha) => linha.produto);

  function mudarLinha(chave: number, mudanca: Partial<LinhaVendida>) {
    setLinhas((atuais) => atuais.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)));
  }

  function adicionarLinha() {
    const chave = proximaLinha.current;
    proximaLinha.current += 1;
    setLinhas((atuais) => [...atuais, { chave, produto: "", quantidade: "1" }]);
  }

  function mudarPagamento(chave: number, mudanca: Partial<LinhaPaga>) {
    setLinhasPagas(pagas.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)));
    if (mudanca.valor !== undefined) setPagamentoAutomatico(false);
  }

  function adicionarPagamento() {
    const restante = Math.max((cobradoEmCentavos ?? 0) - pago, 0);
    const chave = proximoPagamento.current;
    proximoPagamento.current += 1;
    setLinhasPagas([
      ...pagas,
      { chave, forma: pagas.length === 0 ? "pix" : "dinheiro", valor: restante > 0 ? centavosParaCampo(restante) : "" },
    ]);
    setPagamentoAutomatico(false);
  }

  function tirarPagamento(chave: number) {
    setLinhasPagas(pagas.filter((linha) => linha.chave !== chave));
    setPagamentoAutomatico(false);
  }

  return (
    <form action={acao} className="space-y-6">
      {lojas.length > 1 && (
        <label className="block max-w-xs space-y-1.5">
          <span className="text-sm font-semibold sm:text-[13px]">Loja</span>
          <select
            ref={seletorDaLoja}
            name="loja"
            value={loja}
            onChange={(evento) => setLoja(evento.target.value)}
            className={seletor}
          >
            {lojas.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-semibold sm:text-[13px]">
          Produtos
          <MarcaDeObrigatorio />
        </legend>
        {linhas.map((linha) => (
          <LinhaDoProduto
            key={linha.chave}
            linha={linha}
            produtos={escolha.produtos}
            quantidadeDe={quantidadeDe}
            podeTirar={linhas.length > 1}
            aoMudar={(mudanca) => mudarLinha(linha.chave, mudanca)}
            aoTirar={() => setLinhas((atuais) => atuais.filter((outra) => outra.chave !== linha.chave))}
          />
        ))}
        <button type="button" onClick={adicionarLinha} className={botao("fantasma", "sm")}>
          <PlusIcon size={16} />
          Adicionar outro produto
        </button>
      </fieldset>

      <div className="grid gap-6 border-t border-borda pt-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold sm:text-[13px]">
            Valor cobrado
            <MarcaDeObrigatorio />
          </span>
          <input
            name="valor_cobrado"
            inputMode="decimal"
            autoComplete="off"
            value={cobrado}
            onChange={(evento) => setCobradoDigitado(evento.target.value)}
            className={juntar(campo, "tabular-nums")}
          />
          <span className="block text-[13px] text-texto-apagado sm:text-xs">
            Total dos produtos:{" "}
            <span className="text-dinheiro tabular-nums">{centavosEmReais(total)}</span>. Mude só se
            der desconto.
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-semibold sm:text-[13px]">Como o cliente pagou</legend>
          {pagas.map((linha) => (
            <LinhaDePagamento
              key={linha.chave}
              linha={linha}
              aoMudar={(mudanca) => mudarPagamento(linha.chave, mudanca)}
              aoRemover={() => tirarPagamento(linha.chave)}
            />
          ))}
          {pagas.length === 0 && cobradoEmCentavos === 0 && comecou && (
            <p className="text-[13px] text-texto-suave sm:text-xs">Sem custo para o cliente.</p>
          )}
          <button type="button" onClick={adicionarPagamento} className={botao("fantasma", "sm")}>
            <PlusIcon size={16} />
            {pagas.length === 0 ? "Adicionar pagamento" : "Dividir em outra forma"}
          </button>
        </fieldset>
      </div>

      {desconto > 0 && (
        <p className="text-sm text-texto-suave">
          Desconto: <span className="text-dinheiro tabular-nums">{centavosEmReais(desconto)}</span>
        </p>
      )}

      <input
        name="observacao"
        aria-label="Observação"
        placeholder="Observação (opcional)"
        maxLength={200}
        value={observacao}
        onChange={(evento) => setObservacao(evento.target.value)}
        className={campo}
      />

      {problema && comecou && <Mensagem tipo="erro">{problema}</Mensagem>}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}

      <button
        type="submit"
        disabled={enviando || problema !== null}
        className={juntar(botao("primario"), "max-sm:w-full")}
      >
        {enviando ? "Registrando..." : "Confirmar venda"}
      </button>
    </form>
  );
}
