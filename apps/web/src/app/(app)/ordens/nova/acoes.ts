"use server";

import { redirect } from "next/navigation";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import type { Cliente, Ordem, Pagina } from "@/lib/tipos";
import { lerClienteEAparelho } from "./clienteEAparelho";

const MINIMO_PARA_BUSCAR = 2;
const MAXIMO_DE_SUGESTOES = 8;

export async function buscarClientes(termo: string): Promise<Cliente[]> {
  const busca = termo.trim();
  if (busca.length < MINIMO_PARA_BUSCAR) return [];

  const pagina = await chamarApi<Pagina<Cliente>>(
    `/api/clientes/?busca=${encodeURIComponent(busca)}`,
  );
  return pagina.results.slice(0, MAXIMO_DE_SUGESTOES);
}

export async function abrirOrdem(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const { corpo: clienteEAparelho, valores } = lerClienteEAparelho(dados);
  const problema_relatado = texto(dados, "problema_relatado");
  const prometida_para = texto(dados, "prometida_para");

  const corpo = {
    loja: Number(texto(dados, "loja")),
    problema_relatado,
    prometida_para: prometida_para || null,
    ...clienteEAparelho,
  };

  let criada: Ordem;
  try {
    criada = await chamarApi<Ordem>("/api/ordens/", { metodo: "POST", corpo });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível abrir a ordem.", {
      problema_relatado,
      prometida_para,
      ...valores,
    });
  }

  redirect(`/ordens/${criada.id}`);
}
