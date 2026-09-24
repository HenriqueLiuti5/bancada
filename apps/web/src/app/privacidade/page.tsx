import { TextoLegal } from "@/componentes/TextoLegal";

export const metadata = { title: "Política de privacidade · Bancada" };

export default function Privacidade() {
  return (
    <TextoLegal titulo="Política de privacidade" versao="2026-09-rascunho">
      <p>
        Este é um rascunho. O texto definitivo da política de privacidade será publicado antes do
        lançamento do Bancada.
      </p>
      <h2>O que já vale</h2>
      <p>
        Pela Lei Geral de Proteção de Dados, a assistência é a controladora dos dados dos seus
        clientes, e o Bancada é o operador: guarda e processa esses dados apenas para prestar o
        serviço à assistência.
      </p>
      <p>
        A senha de desbloqueio dos aparelhos fica criptografada, só técnicos e o dono conseguem
        vê-la, cada consulta fica registrada, e ela é apagada automaticamente depois da entrega.
      </p>
    </TextoLegal>
  );
}
