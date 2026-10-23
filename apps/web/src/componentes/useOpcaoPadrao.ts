import { useEffect, useRef, type RefObject } from "react";

// O React limpa o formulário depois de cada envio, e o select volta para a opção marcada como
// padrão. Num select controlado o React não marca nenhuma, e a tela mostraria a primeira opção
// enquanto o estado guarda outra. Marcar a escolhida como padrão mantém a escolha na tela e no envio.
export function useOpcaoPadrao(valor: string): RefObject<HTMLSelectElement | null> {
  const seletor = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    for (const opcao of seletor.current?.options ?? []) {
      opcao.defaultSelected = opcao.value === valor;
    }
  }, [valor]);

  return seletor;
}

// O mesmo vale para a caixa de marcar controlada: sem isso, ela aparece desmarcada depois de um
// envio recusado, enquanto o estado continua marcado e mostra os campos que ela abre.
export function useMarcacaoPadrao(marcada: boolean): RefObject<HTMLInputElement | null> {
  const caixa = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (caixa.current) caixa.current.defaultChecked = marcada;
  }, [marcada]);

  return caixa;
}
