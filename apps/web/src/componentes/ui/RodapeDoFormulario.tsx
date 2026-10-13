import { Mensagem } from "@/componentes/ui/Mensagem";
import { botao } from "@/componentes/ui/estilos";
import type { EstadoDoFormulario } from "@/lib/formularios";

export function RodapeDoFormulario({
  estado,
  enviando,
}: {
  estado: EstadoDoFormulario;
  enviando: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-borda pt-4">
      <button type="submit" disabled={enviando} className={botao("primario")}>
        {enviando ? "Salvando..." : "Salvar"}
      </button>
      {estado.ok && <Mensagem tipo="sucesso">{estado.ok}</Mensagem>}
      {estado.erro && <Mensagem tipo="erro">{estado.erro}</Mensagem>}
    </div>
  );
}
