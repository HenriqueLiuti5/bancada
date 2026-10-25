"use server";

import { revalidatePath } from "next/cache";
import { chamarApi } from "@/lib/api";
import { estadoDeErro, texto, type EstadoDoFormulario } from "@/lib/formularios";
import { lerReais } from "@/lib/moeda";
import type { ConferenciaDoCaixa } from "@/lib/tipos";

export type EstadoDaConferencia = EstadoDoFormulario & { conferencia?: ConferenciaDoCaixa };

function lerDinheiro(
  digitado: string,
  campo: string,
  erros: Record<string, string>,
  obrigatorio?: string,
): string | null {
  if (!digitado) {
    if (obrigatorio) erros[campo] = obrigatorio;
    return null;
  }
  const valor = lerReais(digitado);
  if (valor === null) erros[campo] = "Escreva só o número, como 150,00.";
  return valor;
}

function semErros(erros: Record<string, string>): boolean {
  return Object.keys(erros).length === 0;
}

function revalidarOCaixa() {
  revalidatePath("/financeiro/caixa");
  revalidatePath("/painel");
}

export async function registrarMovimento(
  _anterior: EstadoDoFormulario,
  dados: FormData,
): Promise<EstadoDoFormulario> {
  const tipo = texto(dados, "tipo");
  const valores = { valor: texto(dados, "valor"), motivo: texto(dados, "motivo") };
  const erros: Record<string, string> = {};
  const valor = lerDinheiro(valores.valor, "valor", erros, "Informe o valor.");
  if (valor !== null && Number(valor) === 0) erros.valor = "O valor precisa ser maior que zero.";
  if (!semErros(erros)) return { erros, valores };

  try {
    await chamarApi("/api/caixa/movimentos/", {
      metodo: "POST",
      corpo: { loja: Number(texto(dados, "loja")), tipo, valor, motivo: valores.motivo },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível registrar.", valores);
  }

  revalidarOCaixa();
  return { ok: tipo === "retirada" ? "Retirada registrada." : "Reforço registrado." };
}

export async function conferirGaveta(
  _anterior: EstadoDaConferencia,
  dados: FormData,
): Promise<EstadoDaConferencia> {
  const valores = {
    contado: texto(dados, "contado"),
    retirado: texto(dados, "retirado"),
    observacao: texto(dados, "observacao"),
  };
  const erros: Record<string, string> = {};
  const contado = lerDinheiro(
    valores.contado,
    "contado",
    erros,
    "Informe quanto dinheiro tem na gaveta.",
  );
  const retirado = lerDinheiro(valores.retirado, "retirado", erros) ?? "0";
  if (semErros(erros) && Number(retirado) > Number(contado)) {
    erros.retirado = "Não dá para tirar mais do que tem na gaveta.";
  }
  if (!semErros(erros)) return { erros, valores };

  let conferencia: ConferenciaDoCaixa;
  try {
    conferencia = await chamarApi<ConferenciaDoCaixa>("/api/caixa/conferencias/", {
      metodo: "POST",
      corpo: {
        loja: Number(texto(dados, "loja")),
        contado,
        retirado,
        observacao: valores.observacao,
      },
    });
  } catch (erro) {
    return estadoDeErro(erro, "Não foi possível registrar a conferência.", valores);
  }

  revalidarOCaixa();
  return { ok: "Conferência registrada.", conferencia };
}

export async function removerMovimento(dados: FormData): Promise<void> {
  await chamarApi(`/api/caixa/movimentos/${texto(dados, "movimento")}/`, { metodo: "DELETE" });
  revalidarOCaixa();
}
