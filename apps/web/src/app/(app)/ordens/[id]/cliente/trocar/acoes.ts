"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import { lerClienteEAparelho } from "../../../nova/clienteEAparelho";

export async function trocarCliente(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const id = texto(dados, "id");
  const { corpo, valores } = lerClienteEAparelho(dados);

  try {
    await chamarApi(`/api/ordens/${id}/trocar-cliente/`, { metodo: "POST", corpo });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível trocar o cliente.", valores);
  }

  revalidatePath(`/ordens/${id}`);
  revalidatePath("/ordens");
  redirect(`/ordens/${id}`);
}
