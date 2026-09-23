import { chamarApi } from "@/lib/api";
import type { MembroDaEquipe, Pagina } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Membro } from "./membro";
import { NovoMembro } from "./novoMembro";

export const dynamic = "force-dynamic";

const PAPEIS = [
  { nome: "Dono", descricao: "tudo, inclusive gerenciar a equipe" },
  { nome: "Técnico", descricao: "trabalha as ordens e vê a senha de desbloqueio" },
  { nome: "Atendente", descricao: "abre ordens e atende o cliente; não vê a senha nem apaga" },
];

export default async function Equipe() {
  const usuario = await usuarioAtual();

  if (!gerenciaEquipe(usuario)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Só o dono da assistência gerencia a equipe.
        </p>
      </div>
    );
  }

  const pagina = await chamarApi<Pagina<MembroDaEquipe>>("/api/usuarios/");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Quem entra no sistema e o que cada um pode fazer.
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {pagina.results.map((membro) => (
          <Membro key={membro.id} membro={membro} souEu={membro.id === usuario.id} />
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Adicionar alguém</h2>
        <NovoMembro />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">O que cada papel pode fazer</h2>
        <dl className="space-y-1 text-sm">
          {PAPEIS.map((papel) => (
            <div key={papel.nome} className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium">{papel.nome}</dt>
              <dd className="text-neutral-500 dark:text-neutral-400">{papel.descricao}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
