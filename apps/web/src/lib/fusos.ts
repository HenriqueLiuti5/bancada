export type FusoDoBrasil = { valor: string; rotulo: string };

// Os mesmos valores de FusoHorario, em apps/api/bancada/tenants/models.py.
export const FUSOS_DO_BRASIL: FusoDoBrasil[] = [
  { valor: "America/Sao_Paulo", rotulo: "Horário de Brasília" },
  { valor: "America/Manaus", rotulo: "Uma hora a menos que Brasília: AM, MT, MS, RO e RR" },
  { valor: "America/Rio_Branco", rotulo: "Duas horas a menos que Brasília: Acre e oeste do AM" },
  { valor: "America/Noronha", rotulo: "Uma hora a mais que Brasília: Fernando de Noronha" },
];
