import { texto } from "@/lib/formularios";

const CAMPOS_DO_CLIENTE_NOVO = ["nome", "telefone", "email", "documento"];
const CAMPOS_DO_APARELHO_NOVO = ["marca", "modelo", "cor", "imei", "senha_desbloqueio"];
const CAMPOS_QUE_NAO_VOLTAM_PARA_A_TELA = new Set(["senha_desbloqueio"]);

export type ClienteEAparelho = {
  corpo: Record<string, unknown>;
  valores: Record<string, string>;
};

function grupo(dados: FormData, prefixo: string, campos: string[]): Record<string, string> {
  return Object.fromEntries(campos.map((campo) => [campo, texto(dados, `${prefixo}.${campo}`)]));
}

function paraDevolver(prefixo: string, valores: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(valores)
      .filter(([campo]) => !CAMPOS_QUE_NAO_VOLTAM_PARA_A_TELA.has(campo))
      .map(([campo, valor]) => [`${prefixo}.${campo}`, valor]),
  );
}

// Lê o que EscolhaDoCliente e EscolhaDoAparelho enviam: o cliente e o aparelho escolhidos na busca
// ou cadastrados na hora. Os valores voltam para a tela se a API recusar, menos a senha.
export function lerClienteEAparelho(dados: FormData): ClienteEAparelho {
  const clienteNovo = texto(dados, "modo_cliente") === "novo";
  const aparelho = texto(dados, "aparelho");
  const novoCliente = grupo(dados, "cliente_novo", CAMPOS_DO_CLIENTE_NOVO);
  const novoAparelho = grupo(dados, "aparelho_novo", CAMPOS_DO_APARELHO_NOVO);

  return {
    corpo: {
      ...(clienteNovo
        ? { cliente_novo: novoCliente }
        : { cliente: Number(texto(dados, "cliente")) || null }),
      ...(aparelho === "novo" ? { aparelho_novo: novoAparelho } : { aparelho: Number(aparelho) || null }),
    },
    valores: {
      ...paraDevolver("cliente_novo", novoCliente),
      ...paraDevolver("aparelho_novo", novoAparelho),
    },
  };
}
