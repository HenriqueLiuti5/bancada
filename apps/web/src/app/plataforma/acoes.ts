"use server";

import { revalidatePath } from "next/cache";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import { lerReais } from "@/lib/moeda";

export async function lancarCusto(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const descricao = texto(dados, "descricao");
  const digitado = texto(dados, "valor");
  const valores = { descricao, valor: digitado };
  const valor = lerReais(digitado);

  if (!descricao) return { erro: "Descreva o custo.", valores };
  if (valor === null) return { erro: "Valor inválido. Escreva só o número, como 40,00.", valores };

  try {
    await chamarApi("/api/plataforma/custos/", {
      metodo: "POST",
      corpo: { mes: texto(dados, "mes"), descricao, valor },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível lançar o custo.", valores);
  }

  revalidatePath("/plataforma");
  return { ok: "Custo lançado." };
}

export async function removerCusto(dados: FormData): Promise<void> {
  await chamarApi(`/api/plataforma/custos/${texto(dados, "id")}/`, { metodo: "DELETE" });
  revalidatePath("/plataforma");
}
