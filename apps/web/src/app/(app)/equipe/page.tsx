import {
  CrownIcon,
  HeadsetIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WrenchIcon,
} from "@/componentes/icones";
import { CabecalhoDaPagina } from "@/componentes/ui/CabecalhoDaPagina";
import { Cartao } from "@/componentes/ui/Cartao";
import { chamarApi } from "@/lib/api";
import type { Convite, MembroDaEquipe, Pagina } from "@/lib/tipos";
import { gerenciaEquipe, usuarioAtual } from "@/lib/usuario";
import { Tour } from "../tour";
import { ConvitePendente } from "./convitePendente";
import { Membro } from "./membro";
import { NovoConvite } from "./novoConvite";

export const dynamic = "force-dynamic";

const PAPEIS = [
  { nome: "Dono", icone: CrownIcon, descricao: "Faz tudo, inclusive gerenciar a equipe." },
  {
    nome: "Técnico",
    icone: WrenchIcon,
    descricao: "Trabalha as ordens, vê a senha de desbloqueio e pode apagar fotos.",
  },
  {
    nome: "Atendente",
    icone: HeadsetIcon,
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

  const [pagina, convites] = await Promise.all([
    chamarApi<Pagina<MembroDaEquipe>>("/api/usuarios/"),
    chamarApi<Convite[]>("/api/convites/"),
  ]);
  const ativos = pagina.results.filter((membro) => membro.is_active).length;
  const assistencia = usuario.tenant?.nome ?? "";

  return (
    <>
      <CabecalhoDaPagina
        titulo="Equipe"
        descricao={`${ativos} ${ativos === 1 ? "pessoa ativa" : "pessoas ativas"} · quem entra no sistema e o que cada um pode fazer`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Cartao tour="pessoas" titulo="Pessoas" icone={UsersIcon} semEspaco>
            <ul className="divide-y divide-borda">
              {pagina.results.map((membro) => (
                <Membro key={membro.id} membro={membro} souEu={membro.id === usuario.id} />
              ))}
              {convites.map((convite) => (
                <ConvitePendente key={convite.id} convite={convite} assistencia={assistencia} />
              ))}
            </ul>
          </Cartao>

          <Cartao
            tour="convidar"
            titulo="Convidar pessoa"
            icone={UserPlusIcon}
            descricao="Você informa o nome e o papel. A pessoa abre o link do convite e cria a própria senha."
          >
            <NovoConvite assistencia={assistencia} />
          </Cartao>
        </div>

        <aside>
          <Cartao tour="papeis" titulo="Papéis" icone={ShieldCheckIcon}>
            <dl className="space-y-4">
              {PAPEIS.map(({ nome, icone: Icone, descricao }) => (
                <div key={nome} className="flex gap-3">
                  <Icone size={20} className="mt-px shrink-0 text-icone" />
                  <div className="space-y-0.5">
                    <dt className="text-sm font-semibold">{nome}</dt>
                    <dd className="text-[13px] text-texto-apagado">{descricao}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Cartao>
        </aside>
      </div>

      <Tour nome="equipe" />
    </>
  );
}
