"use client";

import { CheckCircleIcon, DeviceMobileIcon, PlusIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { campo, juntar } from "@/componentes/ui/estilos";
import type { Aparelho, Cliente } from "@/lib/tipos";

type Props = {
  cliente: Cliente | null;
  clienteNovo: boolean;
  escolha: string;
  erros: Record<string, string>;
  valores: Record<string, string>;
  onEscolher: (escolha: string) => void;
};

const OPCAO =
  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-150";

function Opcao({
  marcada,
  onClick,
  children,
}: {
  marcada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      onClick={onClick}
      className={juntar(
        OPCAO,
        marcada
          ? "border-anel bg-destaque-suave ring-4 ring-anel/10"
          : "border-borda-forte hover:bg-realce",
      )}
    >
      {children}
      {marcada && (
        <CheckCircleIcon size={22} weight="fill" className="ml-auto shrink-0 text-primario" />
      )}
    </button>
  );
}

function descricao(aparelho: Aparelho): string {
  return [aparelho.descricao, aparelho.cor, aparelho.imei_mascarado && `IMEI ${aparelho.imei_mascarado}`]
    .filter(Boolean)
    .join(" · ");
}

function CamposDoAparelhoNovo({ erros, valores }: Pick<Props, "erros" | "valores">) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoRotulado rotulo="Marca" htmlFor="aparelho-marca" erro={erros["aparelho_novo.marca"]}>
        <input
          id="aparelho-marca"
          name="aparelho_novo.marca"
          required
          placeholder="Samsung, Apple, Motorola..."
          defaultValue={valores["aparelho_novo.marca"]}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado rotulo="Modelo" htmlFor="aparelho-modelo" erro={erros["aparelho_novo.modelo"]}>
        <input
          id="aparelho-modelo"
          name="aparelho_novo.modelo"
          required
          placeholder="Galaxy A15, iPhone 13..."
          defaultValue={valores["aparelho_novo.modelo"]}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado rotulo="Cor" htmlFor="aparelho-cor" erro={erros["aparelho_novo.cor"]} dica="Opcional.">
        <input
          id="aparelho-cor"
          name="aparelho_novo.cor"
          defaultValue={valores["aparelho_novo.cor"]}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado
        rotulo="IMEI"
        htmlFor="aparelho-imei"
        erro={erros["aparelho_novo.imei"]}
        dica="Opcional. Disque *#06# no aparelho para ver."
      >
        <input
          id="aparelho-imei"
          name="aparelho_novo.imei"
          inputMode="numeric"
          defaultValue={valores["aparelho_novo.imei"]}
          className={campo}
        />
      </CampoRotulado>
      <CampoRotulado
        rotulo="Senha de desbloqueio"
        htmlFor="aparelho-senha"
        erro={erros["aparelho_novo.senha_desbloqueio"]}
        dica="Opcional. Se for desenho, anote a sequência, por exemplo 1-2-3-6-9. Fica criptografada e só técnicos e o dono veem."
        className="sm:col-span-2"
      >
        <input
          id="aparelho-senha"
          name="aparelho_novo.senha_desbloqueio"
          autoComplete="off"
          className={campo}
        />
      </CampoRotulado>
    </div>
  );
}

export function EscolhaDoAparelho({ cliente, clienteNovo, escolha, erros, valores, onEscolher }: Props) {
  if (!cliente && !clienteNovo) {
    return (
      <p className="rounded-xl border border-dashed border-borda-forte px-4 py-3.5 text-sm text-texto-apagado">
        Escolha ou cadastre o cliente primeiro.
      </p>
    );
  }

  const aparelhos = cliente?.aparelhos ?? [];

  return (
    <div className="space-y-3">
      <input type="hidden" name="aparelho" value={escolha} />

      {aparelhos.length > 0 && (
        <div className="space-y-2">
          {aparelhos.map((aparelho) => (
            <Opcao
              key={aparelho.id}
              marcada={escolha === String(aparelho.id)}
              onClick={() => onEscolher(String(aparelho.id))}
            >
              <DeviceMobileIcon size={17} className="shrink-0 text-texto-apagado" />
              <span className="truncate">{descricao(aparelho)}</span>
            </Opcao>
          ))}
          <Opcao marcada={escolha === "novo"} onClick={() => onEscolher("novo")}>
            <PlusIcon size={17} className="shrink-0 text-texto-apagado" />
            Outro aparelho
          </Opcao>
        </div>
      )}

      {escolha === "novo" && <CamposDoAparelhoNovo erros={erros} valores={valores} />}
    </div>
  );
}
