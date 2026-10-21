import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { campo, juntar, seletor } from "@/componentes/ui/estilos";

type Props = {
  prefixo: string;
  valores: Record<string, string>;
  erros: Record<string, string>;
  estreito?: boolean;
};

export function CamposDoProduto({ prefixo, valores, erros, estreito = false }: Props) {
  return (
    <div className={juntar("grid gap-4", !estreito && "sm:grid-cols-2")}>
      <CampoRotulado
        rotulo="Nome"
        htmlFor={`${prefixo}-nome`}
        erro={erros.nome}
        obrigatorio
        className={estreito ? "" : "sm:col-span-2"}
      >
        <input
          id={`${prefixo}-nome`}
          name="nome"
          required
          maxLength={120}
          placeholder="Ex.: Tela Moto G54 com aro"
          defaultValue={valores.nome}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado rotulo="Tipo" htmlFor={`${prefixo}-tipo`} erro={erros.tipo}>
        {/* O React limpa o formulário depois de cada envio e só lê o defaultValue de um select
            quando ele nasce: a chave o recria com o tipo que foi enviado. */}
        <select
          key={valores.tipo}
          id={`${prefixo}-tipo`}
          name="tipo"
          defaultValue={valores.tipo ?? "peca"}
          className={seletor}
        >
          <option value="peca">Peça para conserto</option>
          <option value="acessorio">Acessório para vender</option>
        </select>
      </CampoRotulado>

      <CampoRotulado
        rotulo="Código"
        htmlFor={`${prefixo}-codigo`}
        erro={erros.codigo}
        dica="Opcional. O código de barras ou o que a loja usa."
      >
        <input
          id={`${prefixo}-codigo`}
          name="codigo"
          maxLength={60}
          autoComplete="off"
          defaultValue={valores.codigo}
          className={campo}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Custo"
        htmlFor={`${prefixo}-custo`}
        erro={erros.custo}
        dica="Quanto a loja paga por unidade."
      >
        <input
          id={`${prefixo}-custo`}
          name="custo"
          inputMode="decimal"
          autoComplete="off"
          placeholder="R$ 0,00"
          defaultValue={valores.custo}
          className={juntar(campo, "tabular-nums")}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Preço de venda"
        htmlFor={`${prefixo}-preco`}
        erro={erros.preco}
        dica="Entra sozinho no orçamento e na venda no balcão."
      >
        <input
          id={`${prefixo}-preco`}
          name="preco"
          inputMode="decimal"
          autoComplete="off"
          placeholder="R$ 0,00"
          defaultValue={valores.preco}
          className={juntar(campo, "tabular-nums")}
        />
      </CampoRotulado>

      <CampoRotulado
        rotulo="Estoque mínimo"
        htmlFor={`${prefixo}-minimo`}
        erro={erros.minimo}
        dica="Abaixo disso, o produto aparece em Para repor."
      >
        <input
          id={`${prefixo}-minimo`}
          name="minimo"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          defaultValue={valores.minimo}
          className={juntar(campo, "tabular-nums")}
        />
      </CampoRotulado>
    </div>
  );
}
