"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircleIcon } from "@/componentes/icones";
import { CampoRotulado } from "@/componentes/ui/CampoRotulado";
import { campo } from "@/componentes/ui/estilos";
import { conferenciaDoTelefone, problemaDoTelefone, telefoneArrumado } from "@/lib/telefone";

type Props = {
  rotulo: string;
  id: string;
  name: string;
  valorInicial?: string;
  erro?: string;
  dica?: React.ReactNode;
  obrigatorio?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  className?: string;
};

type ErroDoServidor = { erro?: string; valor: string };

export function CampoDeTelefone({
  rotulo,
  id,
  name,
  valorInicial = "",
  erro,
  dica,
  obrigatorio = false,
  autoFocus,
  autoComplete = "off",
  className,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [valor, setValor] = useState(() => telefoneArrumado(valorInicial));
  const [conferido, setConferido] = useState(false);
  const [doServidor, setDoServidor] = useState<ErroDoServidor>({ erro, valor });

  if (erro !== doServidor.erro) setDoServidor({ erro, valor });

  const preenchido = valor.trim() !== "";
  const problema = preenchido ? problemaDoTelefone(valor) : null;
  const conferencia = preenchido ? conferenciaDoTelefone(valor) : null;
  const erroDoServidor = doServidor.valor === valor ? doServidor.erro : undefined;
  const erroMostrado = (conferido && problema) || erroDoServidor || undefined;
  const temDica = Boolean(conferencia || dica);

  useEffect(() => {
    entrada.current?.setCustomValidity(problema ?? "");
  }, [problema]);

  return (
    <CampoRotulado
      rotulo={rotulo}
      htmlFor={id}
      erro={erroMostrado}
      obrigatorio={obrigatorio}
      className={className}
      dica={
        conferencia ? (
          <span className="flex items-start gap-1.5 text-texto-suave">
            <CheckCircleIcon size={15} weight="fill" className="mt-px shrink-0 text-sucesso" />
            <span>Confira: {conferencia}.</span>
          </span>
        ) : (
          dica
        )
      }
    >
      <input
        ref={entrada}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        required={obrigatorio}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder="(11) 91234-5678"
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        onBlur={(evento) => {
          setConferido(true);
          setValor(telefoneArrumado(evento.target.value));
        }}
        onInvalid={() => setConferido(true)}
        aria-invalid={erroMostrado ? true : undefined}
        aria-describedby={erroMostrado ? `${id}-erro` : temDica ? `${id}-dica` : undefined}
        className={campo}
      />
    </CampoRotulado>
  );
}
