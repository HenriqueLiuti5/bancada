import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { campo, juntar, seletor } from "@/componentes/ui/estilos";
import { CATEGORIAS_DAS_CONTAS } from "@/lib/financeiro";
import type { Loja } from "@/lib/tipos";

type Props = {
  prefixo: string;
  valores: Record<string, string>;
  erros: Record<string, string>;
  lojas: Loja[];
  fornecedores: string[];
  hoje: string;
  estreito?: boolean;
};

export function CamposDaConta({
  prefixo,
  valores,
  erros,
  lojas,
  fornecedores,
  hoje,
  estreito = false,
}: Props) {
  const inteira = estreito ? "" : "sm:col-span-2";
  const sugestoes = `${prefixo}-fornecedores`;

  return (
    <div className={juntar("grid gap-4", !estreito && "sm:grid-cols-2")}>
      <CampoRotulado
        rotulo="O que é"
        htmlFor={`${prefixo}-descricao`}
        erro={erros.descricao}
        obrigatorio
        className={inteira}
      >
        <input
          id={`${prefixo}-descricao`}
          name="descricao"
          required
          maxLength={120}
          placeholder="Ex.: Conta de luz de outubro"
          defaultValue={valores.descricao}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Categoria"
        htmlFor={`${prefixo}-categoria`}
        erro={erros.categoria}
        obrigatorio
        className={inteira}
      >
        {/* O React limpa o formulário depois de cada envio e só lê o defaultValue de um select
            quando ele nasce: a chave o recria com a categoria que foi enviada. */}
        <select
          key={valores.categoria}
          id={`${prefixo}-categoria`}
          name="categoria"
          required
          defaultValue={valores.categoria ?? ""}
          className={seletor}
        >
          <option value="" disabled>
            Escolha a categoria
          </option>
          {CATEGORIAS_DAS_CONTAS.map((categoria) => (
            <option key={categoria.valor} value={categoria.valor}>
              {categoria.rotulo}
            </option>
          ))}
        </select>
      </CampoRotulado>

      <CampoRotulado rotulo="Valor" htmlFor={`${prefixo}-valor`} erro={erros.valor} obrigatorio>
        <input
          id={`${prefixo}-valor`}
          name="valor"
          inputMode="decimal"
          autoComplete="off"
          required
          placeholder="R$ 0,00"
          defaultValue={valores.valor}
          className={juntar(campo, "tabular-nums")}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Vencimento"
        htmlFor={`${prefixo}-vencimento`}
        erro={erros.vencimento}
        obrigatorio
      >
        <input
          id={`${prefixo}-vencimento`}
          type="date"
          name="vencimento"
          required
          defaultValue={valores.vencimento ?? hoje}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Para quem"
        htmlFor={`${prefixo}-fornecedor`}
        erro={erros.fornecedor}
        dica="Opcional. A empresa ou a pessoa que recebe."
        className={lojas.length > 1 ? "" : inteira}
      >
        <input
          id={`${prefixo}-fornecedor`}
          name="fornecedor"
          list={fornecedores.length > 0 ? sugestoes : undefined}
          maxLength={120}
          autoComplete="off"
          defaultValue={valores.fornecedor}
          className={campo}
        />
        {fornecedores.length > 0 && (
          <datalist id={sugestoes}>
            {fornecedores.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        )}
      </CampoRotulado>

      {lojas.length > 1 && (
        <CampoRotulado
          rotulo="Loja"
          htmlFor={`${prefixo}-loja`}
          erro={erros.loja}
          dica="Toda a assistência para o que não é de uma loja só, como o contador."
        >
          <select
            key={valores.loja}
            id={`${prefixo}-loja`}
            name="loja"
            defaultValue={valores.loja ?? ""}
            className={seletor}
          >
            <option value="">Toda a assistência</option>
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.ativa ? loja.nome : `${loja.nome} (desativada)`}
              </option>
            ))}
          </select>
        </CampoRotulado>
      )}

      <CampoRotulado
        rotulo="Observação"
        htmlFor={`${prefixo}-observacao`}
        erro={erros.observacao}
        dica="Opcional."
        className={inteira}
      >
        <input
          id={`${prefixo}-observacao`}
          name="observacao"
          maxLength={200}
          defaultValue={valores.observacao}
          className={campo}
        />
      </CampoRotulado>
    </div>
  );
}
