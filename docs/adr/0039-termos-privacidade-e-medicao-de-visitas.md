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

### Parte 2: cópia e exclusão das contas

**Exclusão.** `apagar_assistencia`, em `bancada/plataforma/exclusao.py`, cancela no Asaas a
assinatura que ainda cobra, como o botão de cancelar, e apaga a assistência. As ordens e os
movimentos do estoque saem antes, porque a ordem protege a loja, o cliente e o aparelho, e o
estoque guarda de que ordem saiu cada peça. O resto vai na cascata da própria assistência, então
uma tabela nova da assistência é apagada junto sem mudar esse código. As fotos e a logo saem do
armazenamento só depois que o banco confirma, e o cache das páginas de acompanhamento é limpo.

**O que fica.** A assinatura e as faturas passam para uma ficha: uma assistência sem nome, WhatsApp
nem equipe, com a data de cadastro da original, criada sem o teste grátis que toda assistência nova
ganha. Elas perdem o CPF ou CNPJ de quem pagou e o link da fatura. Assim o recebido mês a mês, a
conversão e os cadastros por semana do painel da plataforma não mudam, e a ficha fica fora da lista
das assistências e da contagem por situação. As entradas e as senhas erradas ficam ligadas só ao
e-mail de quem entrou, até a tarefa da parte 1 apagá-las aos 6 meses. Um registro na auditoria
guarda o número da assistência apagada e o motivo, sem o nome.

**A pedido.** Os comandos `exportar_assistencia` e `apagar_assistencia` acham a assistência pelo
e-mail do dono, e o segundo pede o nome dela para confirmar. A cópia é um `.zip` com uma planilha
por tabela, separada por ponto e vírgula e com BOM para o Excel, as fotos, a logo e um LEIA-ME que
explica como as planilhas se ligam. Ela não leva a senha de desbloqueio, os links de acompanhamento
nem a senha de acesso. Um teste confere que toda tabela ligada à assistência entra na cópia ou está
na lista do que fica de fora: a cobrança, a auditoria, os convites e o registro dos e-mails ao
cliente.

**Sozinha.** A conta fica só para consulta no dia seguinte ao fim do teste sem assinatura, ao fim do
período pago depois do cancelamento ou ao fim dos 7 dias de tolerância do atraso. Seis meses
depois, a tarefa diária `plataforma.apagar_contas_so_para_consulta`, às 7h30, apaga a conta. Trinta
dias antes, ela manda o aviso aos donos e guarda o dia em `aviso_de_exclusao_em`; se o aviso sai
tarde, a exclusão espera os 30 dias dele. Assinar ou pagar tira a conta da consulta, e o aviso de
uma consulta anterior não vale para a seguinte.

**Na tela.** A API devolve `apaga_em` no resumo da assinatura, e o aviso de só para consulta e a
tela Assinatura mostram esse dia. A página inicial, a confirmação do cancelamento e o e-mail do fim
do teste deixaram de dizer que nada é apagado.

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

A exclusão não tem volta: o que foi apagado fica só nas cópias de segurança, por até 30 dias.

A ficha das cobranças ainda não tem prazo para sumir. A lei fiscal pede 5 anos, e apagar a ficha
depois disso fica para quando a primeira chegar lá.

As assistências dos dados de exemplo nascem com datas perto de hoje e não chegam aos 6 meses só
para consulta. Uma assistência de teste esquecida num banco de desenvolvimento é apagada como
qualquer outra.

Apagar uma foto pela tela também passou a tirar o arquivo do disco só depois que o banco confirma,
como já acontecia com a logo.

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

Guardar a própria assistência sem os dados, em vez de passar as cobranças para uma ficha: seria
preciso apagar tabela por tabela, na ordem que as proteções entre elas pedem, e uma tabela nova
ficaria esquecida.

Apagar também as cobranças: o recebido do painel da plataforma mudaria a cada assistência apagada,
e a lei fiscal pede que elas fiquem.

Um botão de apagar no painel da plataforma: o comando no servidor evita o clique por engano, e os
pedidos chegam pelo suporte de qualquer jeito.
