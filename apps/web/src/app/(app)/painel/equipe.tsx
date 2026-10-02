import { Users } from "lucide-react";
import { Cartao } from "@/componentes/ui/Cartao";
import { EstadoVazio } from "@/componentes/ui/EstadoVazio";
import { Secao } from "@/componentes/ui/Secao";
import { emReais } from "@/lib/moeda";
import type { LinhaDaEquipe } from "@/lib/tipos";

export function SecaoEquipe({ equipe }: { equipe: LinhaDaEquipe[] }) {
  return (
    <Secao
      titulo="Equipe"
      descricao="Ordens entregues no período e o dinheiro que entrou por elas, pelo técnico responsável."
      tour="equipe"
    >
      <Cartao semEspaco>
        {equipe.length === 0 ? (
          <EstadoVazio
            icone={<Users size={18} strokeWidth={1.75} />}
            titulo="Nenhuma entrega no período"
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borda text-left text-xs text-texto-suave">
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Técnico
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Entregues
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  Recebido
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {equipe.map((linha) => (
                <tr key={linha.tecnico ?? "sem"}>
                  <td
                    className={`px-5 py-2.5 ${linha.tecnico === null ? "text-texto-suave" : ""}`}
                  >
                    {linha.nome}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{linha.concluidas}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{emReais(linha.recebido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
    </Secao>
  );
}
