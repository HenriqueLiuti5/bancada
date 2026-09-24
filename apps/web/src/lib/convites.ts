import { FUSO_HORARIO } from "@/lib/datas";
import type { Convite } from "@/lib/tipos";

export function mensagemDoConvite(convite: Convite, assistencia: string): string {
  const primeiroNome = convite.nome.split(" ")[0];
  return `Olá, ${primeiroNome}! Este é o seu convite para entrar na equipe da ${assistencia} no Bancada. Abra o link e crie a sua senha: ${convite.link}`;
}

export function validadeDoConvite(convite: Convite): string {
  const data = new Date(convite.expira_em).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: FUSO_HORARIO,
  });
  return convite.expirado ? `expirou em ${data}` : `vale até ${data}`;
}
