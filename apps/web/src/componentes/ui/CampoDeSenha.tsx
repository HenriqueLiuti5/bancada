"use client";

import { useEffect, useRef, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@/componentes/icones";
import { campo, juntar } from "@/componentes/ui/estilos";

type Props = Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
  classeDoContorno?: string;
};

// Campo de senha com um botão que mostra e esconde o que foi digitado. O nome do botão fica num
// texto escondido, e não em aria-label, porque os testes acham o campo por getByLabel("Senha"),
// que também casaria com um aria-label "Mostrar senha".
export function CampoDeSenha({ className = campo, classeDoContorno, disabled, ...props }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [visivel, setVisivel] = useState(false);
  const acao = visivel ? "Ocultar senha" : "Mostrar senha";

  // A senha volta a ficar escondida no envio, para o navegador não guardá-la como texto comum.
  useEffect(() => {
    const formulario = entrada.current?.form;
    if (!formulario) return;
    const esconder = () => setVisivel(false);
    formulario.addEventListener("submit", esconder);
    return () => formulario.removeEventListener("submit", esconder);
  }, []);

  // Enquanto aparece, o campo é de texto: sem spellCheck, o corretor do navegador poderia mandar a
  // senha para fora, e o teclado do celular a corrigiria. O mousedown sem efeito deixa o foco no
  // campo, para seguir digitando sem o teclado do celular fechar.
  return (
    <div className={juntar("relative", classeDoContorno)}>
      <input
        {...props}
        ref={entrada}
        type={visivel ? "text" : "password"}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={juntar(className, "pr-11 sm:pr-10 [&::-ms-reveal]:hidden")}
      />
      <button
        type="button"
        title={acao}
        aria-controls={props.id}
        disabled={disabled}
        onMouseDown={(evento) => evento.preventDefault()}
        onClick={() => setVisivel(!visivel)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-xl text-texto-apagado transition-colors duration-150 hover:text-texto focus-visible:-outline-offset-4 disabled:pointer-events-none disabled:opacity-50 sm:w-10"
      >
        {visivel ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
        <span className="sr-only">{acao}</span>
      </button>
    </div>
  );
}
