import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import type { MembroDaEquipe, Pagina } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Membro } from "./membro";
import { NovoMembro } from "./novoMembro";

export const dynamic = "force-dynamic";

const PAPEIS = [
  { nome: "Dono", descricao: "Faz tudo, inclusive gerenciar a equipe." },
  { nome: "Técnico", descricao: "Trabalha as ordens, vê a senha de desbloqueio e pode apagar fotos." },
  {
    nome: "Atendente",
    descricao: "Abre ordens e atende o cliente. Não vê a senha de desbloqueio nem apaga nada.",
  },
];

export default async function Equipe() {
  const usuario = await usuarioAtual();

  if (!gerenciaEquipe(usuario)) {
    return (
      <CabecalhoDaPagina
        titulo="Equipe"
        descricao="Só o dono da assistência gerencia a equipe."
      />
    );
  }

  const pagina = await chamarApi<Pagina<MembroDaEquipe>>("/api/usuarios/");
  const ativos = pagina.results.filter((membro) => membro.is_active).length;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Equipe"
        descricao={`${ativos} ${ativos === 1 ? "pessoa ativa" : "pessoas ativas"} · quem entra no sistema e o que cada um pode fazer`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Cartao titulo="Pessoas" semEspaco>
            <ul className="divide-y divide-borda">
              {pagina.results.map((membro) => (
                <Membro key={membro.id} membro={membro} souEu={membro.id === usuario.id} />
              ))}
            </ul>
          </Cartao>

          <Cartao
            titulo="Adicionar pessoa"
            descricao="A pessoa entra com o usuário e a senha que você definir aqui."
          >
            <NovoMembro />
          </Cartao>
        </div>

        <aside>
          <Cartao titulo="Papéis">
            <dl className="space-y-3">
              {PAPEIS.map((papel) => (
                <div key={papel.nome} className="space-y-0.5">
                  <dt className="text-[13px] font-medium">{papel.nome}</dt>
                  <dd className="text-[13px] text-texto-suave">{papel.descricao}</dd>
                </div>
              ))}
            </dl>
          </Cartao>
        </aside>
      </div>
    </>
  );
}
