import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <TelaDeAcesso
      titulo="Entrar no Bancada"
      descricao="Ordens de serviço da sua assistência técnica"
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
