const COR_DO_STATUS: Record<string, string> = {
  recebido: "bg-status-novo",
  em_diagnostico: "bg-status-andamento",
  aprovado: "bg-status-andamento",
  em_reparo: "bg-status-andamento",
  orcamento_enviado: "bg-status-espera",
  aguardando_peca: "bg-status-espera",
  pronto: "bg-status-pronto",
  entregue: "bg-status-encerrado",
  devolvido_sem_reparo: "bg-status-encerrado",
  reprovado: "bg-status-recusado",
};

export function PontoDeStatus({ status, tamanho = "sm" }: { status: string; tamanho?: "sm" | "md" }) {
  const cor = COR_DO_STATUS[status] ?? "bg-status-encerrado";
  const medida = tamanho === "md" ? "size-2" : "size-1.5";
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full ${medida} ${cor}`} />;
}

export function Selo({ status, rotulo }: { status: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-borda bg-superficie px-2 py-0.5 text-xs font-medium whitespace-nowrap text-texto-suave">
      <PontoDeStatus status={status} />
      {rotulo}
    </span>
  );
}
