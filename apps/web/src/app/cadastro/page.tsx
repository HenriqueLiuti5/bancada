import Link from "next/link";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { FormularioDeCadastro } from "./formulario";

export const metadata = { title: "Criar conta · Bancada" };

export default function Cadastro() {
  return (
    <TelaDeAcesso
      larga
      titulo="Crie a conta da sua assistência"
      descricao="Em um minuto você abre a primeira ordem de serviço."
      rodape={
        <>
          Já tem conta?{" "}
          <Link href="/login" className={link}>
            Entrar
          </Link>
        </>
      }
    >
      <FormularioDeCadastro />
    </TelaDeAcesso>
  );
}
