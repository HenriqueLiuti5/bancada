import type { Instrumentation } from "next";
import { avisarDoErro } from "@/lib/monitoramento";

export const onRequestError: Instrumentation.onRequestError = async (erro, pedido, contexto) => {
  await avisarDoErro(erro, contexto.routePath, {
    metodo: pedido.method,
    tipo_de_rota: contexto.routeType,
  });
};
