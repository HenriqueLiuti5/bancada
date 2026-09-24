import { TelaDeAcesso } from "@/componentes/TelaDeAcesso";
import { FormularioDeNovaSenha } from "./formulario";

export const metadata = { title: "Nova senha · Bancada" };

type Props = { params: Promise<{ uid: string; token: string }> };

export default async function RedefinirSenha({ params }: Props) {
  const { uid, token } = await params;

  return (
    <TelaDeAcesso titulo="Crie uma nova senha" descricao="Depois de salvar, você já entra no sistema.">
      <FormularioDeNovaSenha uid={uid} token={token} />
    </TelaDeAcesso>
  );
}
