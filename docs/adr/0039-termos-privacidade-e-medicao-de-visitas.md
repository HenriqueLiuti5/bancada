# 0039 — Termos, privacidade e medição de visitas

## Contexto

Os termos de uso e a política de privacidade eram o rascunho da ADR 0032, escrito antes do estoque,
das vendas no balcão, do financeiro e das lojas. O que dependia de decisão estava entre colchetes:
quem oferece o Bancada, o contato, o horário do suporte, a devolução no cancelamento, o limite da
responsabilidade, o prazo para apagar as contas e a guarda dos registros de acesso. A ADR 0032
previa que um advogado revisasse os textos.

Os textos só podem prometer o que o sistema faz, e faltavam três coisas. As entradas no sistema não
ficavam registradas, só as senhas erradas. Nenhuma assistência era apagada, nem a pedido. E não
havia medição de visitas.

No começo da fase, em 28 de outubro de 2026, o Henrique decidiu:

- Os dois textos são escritos de novo, para o sistema de hoje, em vez de completar o rascunho.
- O e-mail de contato é o dele, henrique.liuti5@gmail.com, até o domínio do Bancada ser registrado.
- Não há devolução do valor proporcional do mês em andamento no cancelamento.
- Os registros de acesso ficam guardados por 6 meses, como pede o Marco Civil da Internet.
- Os textos não passam por advogado.
- A medição de visitas com o Umami continua na fase.
- Os prazos para apagar os dados ficam para a fase escolher.
- O limite da responsabilidade é o valor pago nos 12 meses anteriores ao problema, o formato mais
  comum nos contratos de sistemas.

A fase é feita em três partes, uma de cada vez: os textos, com o registro das entradas; a cópia e a
exclusão das contas; a medição de visitas.

## Decisão

### Parte 1: termos e privacidade

**Textos escritos de novo.** Os termos descrevem o serviço inteiro, das ordens de serviço ao caixa,
e as regras que o sistema já aplica: o teste de 30 dias, o modo só para consulta depois do teste,
do cancelamento ou de 7 dias de atraso, e a senha de desbloqueio apagada 7 dias depois que o
aparelho sai. A política diz o que cada parte do sistema guarda, quem vê o quê, inclusive o painel
da plataforma, o que vai ao Asaas, o que a página do cliente mostra e os três cookies, com o
`lateral`, que a lista do rascunho não tinha. Nenhum trecho ficou entre colchetes.

**Prazos para apagar.** A pedido do dono, a conta é apagada em até 15 dias, e ele pode pedir antes
uma cópia dos dados. Sem pedido, a conta que passa 6 meses seguidos só para consulta é apagada, com
um aviso por e-mail 30 dias antes. Seis meses dão tempo de a assistência voltar, e a LGPD não deixa
o operador guardar os dados depois do fim do serviço sem motivo (art. 15 e 16). O que foi apagado
continua nas cópias de segurança por até 30 dias (ADR 0029), e os registros das cobranças ficam,
pela lei fiscal. A parte 2 põe esses prazos em prática.

**Responsabilidade.** O Bancada não responde por prejuízos indiretos, e a indenização fica limitada
ao que a assistência pagou nos 12 meses anteriores ao problema, menos quando a lei não permite o
limite.

**Contato num lugar só.** O nome do responsável, o e-mail de contato e o horário do suporte ficam
em `src/lib/textosLegais.ts`, ao lado da versão, e as duas páginas leem dali. O link do WhatsApp sai
do `WHATSAPP_DO_SUPORTE` do servidor (ADR 0030), como no rodapé da página inicial; sem o número, o
texto cita o WhatsApp do suporte sem link.

**Provedores pelo que fazem.** A política descreve o servidor, o envio de e-mails, o armazenamento
e o monitoramento pela função de cada um. Os nomes entram na 4F, quando forem contratados.

**Registros de acesso.** Cada sessão aberta, pelo login, pelo cadastro, pelo aceite do convite ou
pela redefinição da senha, grava na auditoria uma Entrada no sistema, com o IP. Com as senhas
erradas, que já ficavam lá, elas formam os registros de acesso do Marco Civil. A tarefa diária
`auditoria.apagar_registros_de_acesso_vencidos` apaga as duas quando passam de 6 meses, contados no
calendário. Os registros das ações sensíveis, como a consulta à senha de desbloqueio, ficam enquanto
a conta existir.

**Versão.** Os textos passaram à versão `2026-10-28`, na API e no site.

## Consequências

O Bancada ainda não está no ar, então nenhuma assistência real aceitou os rascunhos. As assistências
dos bancos de desenvolvimento guardam `2026-10-rascunho`, sem efeito. Por isso a troca da versão não
pede um novo aceite, como a ADR 0018 previa.

Depois do lançamento, uma mudança que afete os direitos ou os deveres da assistência é avisada ao
dono por e-mail 30 dias antes, e continuar usando o sistema vale como aceite. O sistema não mostra
esse aviso nas telas nem pede um novo aceite. A troca do e-mail pelo do domínio é uma correção: muda
a versão, sem os 30 dias.

Os textos não passaram por advogado. Eles ressalvam os casos em que a lei não permite o limite da
responsabilidade, como pode acontecer se a Justiça tratar o contrato com uma assistência pequena
como relação de consumo.

Os registros de acesso guardam o IP sem a porta de origem, que o Caddy não repassa ao Next. Com o
mesmo IP dividido entre muitos clientes das operadoras de celular, uma investigação pode pedir a
porta; guardá-la passa por repassar a porta do Caddy ao Next e do Next à API.

Até a parte 2, os termos prometem a cópia e a exclusão das contas, que o sistema ainda não faz.

## Alternativas consideradas

Completar o rascunho da ADR 0032, preenchendo os colchetes: o Henrique preferiu textos novos,
porque o rascunho não conhecia o estoque, as vendas no balcão, o financeiro e as lojas.

Guardar o IP de cada pedido, ou a cada 15 minutos, como o último acesso: multiplicaria os
registros, e a entrada já liga cada pessoa ao IP de onde ela abriu a sessão.

Guardar os registros de acesso nos logs do Caddy: eles teriam a porta de origem, mas não diriam de
quem era cada acesso e guardariam os links de acompanhamento e de recuperação de senha que passam
no endereço.

Apagar as contas só a pedido: os dados dos clientes de uma assistência que foi embora ficariam
guardados para sempre.
