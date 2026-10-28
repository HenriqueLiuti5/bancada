import Link from "next/link";
import { Estatisticas } from "@/componentes/Estatisticas";
import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { link } from "@/componentes/ui/estilos";
import { buscarOfertaSeDisponivel, testeGratis } from "@/lib/oferta";
import { FormularioDeCadastro } from "./formulario";

export const metadata = { title: "Criar conta · Bancada" };

export default async function Cadastro() {
  const oferta = await buscarOfertaSeDisponivel();

  return (
    <>
      <TelaDeAcesso
        larga
        titulo="Crie a conta da sua assistência"
        descricao={`Em um minuto você abre a primeira ordem de serviço. ${testeGratis(oferta)}, sem cartão de crédito.`}
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
      <Estatisticas />
    </>
  );
}
