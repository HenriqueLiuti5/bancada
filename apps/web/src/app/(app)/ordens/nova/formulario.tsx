"use client";

import { useActionState, useState } from "react";
import type { Cliente, Loja } from "@/lib/tipos";
import { abrirOrdem, type EstadoAbertura } from "./acoes";

const INICIAL: EstadoAbertura = {};

const CAMPO =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

export function FormularioDeAbertura({
  lojas,
  clientes,
}: {
  lojas: Loja[];
  clientes: Cliente[];
}) {
  const [estado, acao, enviando] = useActionState(abrirOrdem, INICIAL);
  const [clienteId, setClienteId] = useState<string>("");

  const selecionado = clientes.find((c) => String(c.id) === clienteId);
  const aparelhos = selecionado?.aparelhos ?? [];

  return (
    <form action={acao} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="loja" className="text-sm font-medium">
          Loja
        </label>
        <select id="loja" name="loja" className={CAMPO} defaultValue={lojas[0]?.id ?? ""}>
          {lojas.map((loja) => (
            <option key={loja.id} value={loja.id}>
              {loja.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cliente" className="text-sm font-medium">
          Cliente
        </label>
        <select
          id="cliente"
          name="cliente"
          className={CAMPO}
          value={clienteId}
          onChange={(evento) => setClienteId(evento.target.value)}
        >
          <option value="">Selecione</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} · {cliente.telefone}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="aparelho" className="text-sm font-medium">
          Aparelho
        </label>
        <select id="aparelho" name="aparelho" className={CAMPO} disabled={!clienteId}>
          <option value="">{clienteId ? "Selecione" : "Escolha o cliente primeiro"}</option>
          {aparelhos.map((aparelho) => (
            <option key={aparelho.id} value={aparelho.id}>
              {aparelho.descricao}
              {aparelho.cor && ` · ${aparelho.cor}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="problema_relatado" className="text-sm font-medium">
          Problema relatado
        </label>
        <textarea
          id="problema_relatado"
          name="problema_relatado"
          rows={4}
          placeholder="O que o cliente descreveu"
          className={CAMPO}
        />
      </div>

      {estado.erro && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {enviando ? "Abrindo..." : "Abrir ordem"}
      </button>
    </form>
  );
}
