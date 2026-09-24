import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { FormularioEsqueciSenha } from "./formulario";

export const metadata = { title: "Esqueci minha senha · Bancada" };

export default function EsqueciSenha() {
  return (
    <TelaDeAcesso
      titulo="Esqueceu a senha?"
      descricao="Mandamos um link para você criar uma nova."
      rodape={
        <Link href="/login" className={link}>
          Voltar para o login
        </Link>
      }
    >
      <FormularioEsqueciSenha />
    </TelaDeAcesso>
  );
}
