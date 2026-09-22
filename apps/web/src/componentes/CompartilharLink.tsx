"use client";

import { useState } from "react";

export function CompartilharLink({
  url,
  aparelho,
  cliente,
}: {
  url: string;
  aparelho: string;
  cliente: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Olá, ${cliente}! Acompanhe o reparo do seu ${aparelho} por aqui: ${url}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 px-5 py-4 dark:border-neutral-800">
      <h2 className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
        Link do cliente
      </h2>

      <p className="truncate rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs dark:bg-neutral-900">
        {url}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copiar}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Enviar no WhatsApp
        </a>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Ver como o cliente vê
        </a>
      </div>
    </div>
  );
}
