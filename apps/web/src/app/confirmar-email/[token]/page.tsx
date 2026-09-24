import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { botao, juntar } from "@/componentes/ui/estilos";
import { chamarApi, mensagemDaApi } from "@/lib/api";
import { lerToken } from "@/lib/sessao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmar e-mail · Bancada" };

type Props = { params: Promise<{ token: string }> };

type Resultado = { confirmado: string } | { problema: string };

async function confirmar(token: string): Promise<Resultado> {
  try {
    const { email } = await chamarApi<{ email: string }>("/api/auth/email/confirmar/", {
      metodo: "POST",
      corpo: { token },
      autenticado: false,
    });
    return { confirmado: email };
  } catch (erro) {
    return { problema: mensagemDaApi(erro, "Não foi possível confirmar o e-mail.") };
  }
}

export default async function ConfirmarEmail({ params }: Props) {
  const { token } = await params;
  const [resultado, sessao] = await Promise.all([confirmar(token), lerToken()]);
  const destino = sessao ? { href: "/ordens", rotulo: "Ir para o sistema" } : { href: "/login", rotulo: "Entrar" };

  if ("problema" in resultado) {
    return (
      <TelaDeAcesso titulo="Link inválido">
        <div className="flex flex-col items-center gap-4 text-center">
          <CircleAlert size={22} strokeWidth={1.75} className="text-perigo-forte" />
          <p className="text-sm text-texto-suave">
            {resultado.problema} Entre no sistema e peça um novo link no aviso do topo da tela.
          </p>
          <Link href={destino.href} className={juntar(botao("primario"), "w-full")}>
            {destino.rotulo}
          </Link>
        </div>
      </TelaDeAcesso>
    );
  }

  return (
    <TelaDeAcesso titulo="E-mail confirmado">
      <div className="flex flex-col items-center gap-4 text-center">
        <CircleCheck size={22} strokeWidth={1.75} className="text-sucesso" />
        <p className="text-sm text-texto-suave">
          Tudo certo com <strong className="font-medium text-texto">{resultado.confirmado}</strong>.
          Se esquecer a senha, é para ele que mandamos o link.
        </p>
        <Link href={destino.href} className={juntar(botao("primario"), "w-full")}>
          {destino.rotulo}
        </Link>
      </div>
    </TelaDeAcesso>
  );
}
