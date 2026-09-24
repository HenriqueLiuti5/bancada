import { TextoLegal } from "@/componentes/TextoLegal";

export const metadata = { title: "Termos de uso · Bancada" };

export default function Termos() {
  return (
    <TextoLegal titulo="Termos de uso" versao="2026-09-rascunho">
      <p>
        Este é um rascunho. O texto definitivo dos termos de uso será publicado antes do lançamento
        do Bancada, e quem já tiver conta será avisado para ler e aceitar a nova versão.
      </p>
      <h2>O que já vale</h2>
      <p>
        O Bancada é um sistema para assistências técnicas registrarem ordens de serviço e
        mostrarem o andamento do reparo aos seus clientes. Os dados que a assistência cadastra
        pertencem a ela.
      </p>
    </TextoLegal>
  );
}
