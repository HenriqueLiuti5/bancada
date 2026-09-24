"use server";

import { redirect } from "next/navigation";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import type { Cliente, Ordem, Pagina } from "@/lib/tipos";

const MINIMO_PARA_BUSCAR = 2;
const MAXIMO_DE_SUGESTOES = 8;

const CAMPOS_DO_CLIENTE_NOVO = ["nome", "telefone", "email", "documento"];
const CAMPOS_DO_APARELHO_NOVO = ["marca", "modelo", "cor", "imei", "senha_desbloqueio"];
const CAMPOS_QUE_NAO_VOLTAM_PARA_A_TELA = new Set(["senha_desbloqueio"]);

export async function buscarClientes(termo: string): Promise<Cliente[]> {
  const busca = termo.trim();
  if (busca.length < MINIMO_PARA_BUSCAR) return [];

  const pagina = await chamarApi<Pagina<Cliente>>(
    `/api/clientes/?busca=${encodeURIComponent(busca)}`,
  );
  return pagina.results.slice(0, MAXIMO_DE_SUGESTOES);
}

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

export async function abrirOrdem(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const clienteNovo = texto(dados, "modo_cliente") === "novo";
  const aparelhoNovo = texto(dados, "aparelho") === "novo";

  const novoCliente = grupo(dados, "cliente_novo", CAMPOS_DO_CLIENTE_NOVO);
  const novoAparelho = grupo(dados, "aparelho_novo", CAMPOS_DO_APARELHO_NOVO);
  const problema_relatado = texto(dados, "problema_relatado");

  const corpo = {
    loja: Number(texto(dados, "loja")),
    problema_relatado,
    ...(clienteNovo
      ? { cliente_novo: novoCliente }
      : { cliente: Number(texto(dados, "cliente")) || null }),
    ...(aparelhoNovo
      ? { aparelho_novo: novoAparelho }
      : { aparelho: Number(texto(dados, "aparelho")) || null }),
  };

  let criada: Ordem;
  try {
    criada = await chamarApi<Ordem>("/api/ordens/", { metodo: "POST", corpo });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível abrir a ordem.", {
      problema_relatado,
      ...paraDevolver("cliente_novo", novoCliente),
      ...paraDevolver("aparelho_novo", novoAparelho),
    });
  }

  redirect(`/ordens/${criada.id}`);
}
