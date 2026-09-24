import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { SESSAO_EXPIRADA } from "@/lib/sessao";
import { FormularioLogin } from "./formulario";

type Props = { searchParams: Promise<{ sessao?: string }> };

export default async function Login({ searchParams }: Props) {
  const { sessao } = await searchParams;
  const expirou = sessao === SESSAO_EXPIRADA;

  return (
    <TelaDeAcesso
      titulo="Entrar no Bancada"
      descricao={
        expirou
          ? "Sua sessão terminou. Entre de novo para continuar."
          : "Ordens de serviço da sua assistência técnica"
      }
      rodape={
        <>
          Ainda não usa o Bancada?{" "}
          <Link href="/cadastro" className={link}>
            Criar conta grátis
          </Link>
        </>
      }
    >
      <FormularioLogin />
    </TelaDeAcesso>
  );
}
