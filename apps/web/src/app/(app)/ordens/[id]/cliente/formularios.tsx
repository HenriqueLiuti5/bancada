"use client";

import { useActionState } from "react";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { RodapeDoFormulario } from "@/componentes/ui/RodapeDoFormulario";
import { campo } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";
import { formatarTelefone } from "@/lib/telefone";
import type { Aparelho, Cliente } from "@/lib/tipos";
import { salvarAparelho, salvarCliente } from "./acoes";

const INICIAL: EstadoDoFormulario = {};

export function FormularioDoCliente({ ordem, cliente }: { ordem: number; cliente: Cliente }) {
  const [estado, acao, enviando] = useActionState(salvarCliente, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {
    nome: cliente.nome,
    telefone: formatarTelefone(cliente.telefone),
    email: cliente.email,
    documento: cliente.documento,
  };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="ordem" value={ordem} />
      <input type="hidden" name="id" value={cliente.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Nome" htmlFor="cliente-nome" erro={erros.nome}>
          <input id="cliente-nome" name="nome" required defaultValue={valores.nome} className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="Telefone / WhatsApp" htmlFor="cliente-telefone" erro={erros.telefone}>
          <input
            id="cliente-telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            required
            placeholder="(11) 91234-5678"
            defaultValue={valores.telefone}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado
          rotulo="E-mail"
          htmlFor="cliente-email"
          erro={erros.email}
          dica="Opcional. Os avisos do reparo vão para este e-mail."
        >
          <input
            id="cliente-email"
            name="email"
            type="email"
            defaultValue={valores.email}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="CPF" htmlFor="cliente-documento" erro={erros.documento} dica="Opcional.">
          <input
            id="cliente-documento"
            name="documento"
            inputMode="numeric"
            defaultValue={valores.documento}
            className={campo}
          />
        </CampoRotulado>
      </div>
      <RodapeDoFormulario estado={estado} enviando={enviando} />
    </form>
  );
}

export function FormularioDoAparelho({ ordem, aparelho }: { ordem: number; aparelho: Aparelho }) {
  const [estado, acao, enviando] = useActionState(salvarAparelho, INICIAL);
  const erros = estado.erros ?? {};
  const valores = estado.valores ?? {
    marca: aparelho.marca,
    modelo: aparelho.modelo,
    cor: aparelho.cor,
    imei: aparelho.imei,
  };

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="ordem" value={ordem} />
      <input type="hidden" name="id" value={aparelho.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoRotulado rotulo="Marca" htmlFor="aparelho-marca" erro={erros.marca}>
          <input
            id="aparelho-marca"
            name="marca"
            required
            placeholder="Samsung, Apple, Motorola..."
            defaultValue={valores.marca}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Modelo" htmlFor="aparelho-modelo" erro={erros.modelo}>
          <input
            id="aparelho-modelo"
            name="modelo"
            required
            placeholder="Galaxy A15, iPhone 13..."
            defaultValue={valores.modelo}
            className={campo}
          />
        </CampoRotulado>
        <CampoRotulado rotulo="Cor" htmlFor="aparelho-cor" erro={erros.cor} dica="Opcional.">
          <input id="aparelho-cor" name="cor" defaultValue={valores.cor} className={campo} />
        </CampoRotulado>
        <CampoRotulado
          rotulo="IMEI"
          htmlFor="aparelho-imei"
          erro={erros.imei}
          dica="Opcional. Disque *#06# no aparelho para ver."
        >
          <input
            id="aparelho-imei"
            name="imei"
            inputMode="numeric"
            defaultValue={valores.imei}
            className={campo}
          />
        </CampoRotulado>
      </div>
      <RodapeDoFormulario estado={estado} enviando={enviando} />
    </form>
  );
}
