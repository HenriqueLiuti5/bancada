# Plano do projeto

## Problema

Assistências técnicas de celular controlam ordens de serviço em caderno, planilha ou grupo de
WhatsApp. O resultado é previsível: o cliente liga toda hora para perguntar do aparelho, o
técnico perde tempo respondendo, e quando há divergência sobre prazo, preço ou estado do
aparelho na entrada, não existe registro para resolver a discussão.

## Produto

O Bancada é um sistema onde a assistência registra cliente, aparelho e defeito, e acompanha a
ordem de serviço por uma sequência de estados até a entrega. Cada ordem gera um link público e
não adivinhável que a assistência manda ao cliente. O cliente abre o link sem criar conta e vê
a linha do tempo do reparo, o orçamento e as fotos do aparelho na entrada.

É um SaaS B2B com assinatura self-service: a assistência se cadastra sozinha e paga mensalidade.

## Domínio

```
Tenant (assistência)  ──< Loja ──< Usuário (dono | técnico | atendente)
Cliente (da assistência)  ──< Aparelho (marca, modelo, IMEI, senha, cor)

OrdemServico
  número, tenant, loja, cliente, aparelho, técnico responsável,
  status, problema relatado, diagnóstico, laudo,
  checklist de entrada, fotos, garantia, datas, token público
    ──< ItemOrcamento (peça ou serviço, valor, aprovado)
    ──< EventoOS (histórico imutável: quem, quando, de qual status para qual)
```

### Estados de uma ordem de serviço

```
RECEBIDO → EM_DIAGNOSTICO → ORCAMENTO_ENVIADO ─┬→ APROVADO → EM_REPARO ─┬→ PRONTO → ENTREGUE
                                               │                        └→ AGUARDANDO_PECA ↺
                                               └→ REPROVADO → DEVOLVIDO_SEM_REPARO
```

Transições são validadas explicitamente. Cada uma grava um `EventoOS`, que nunca é editado nem
apagado. Esse histórico é a trilha de auditoria do produto e será a base de dados da camada de
inteligência artificial na Fase 5.

## Dados sensíveis

O sistema armazena CPF, telefone, IMEI e, inevitavelmente, a senha ou o padrão de desbloqueio
do aparelho. Três regras decorrem disso e valem desde a primeira linha de código:

1. A senha de desbloqueio é criptografada em nível de campo, acessível apenas a usuários com
   papel técnico do próprio tenant, com acesso registrado em auditoria, e purgada automaticamente
   após a entrega do aparelho.
2. A página pública expõe o mínimo: status, linha do tempo, orçamento e fotos. Nunca IMEI
   completo, CPF ou endereço.
3. Fotos ficam em bucket privado, servidas por URL assinada com validade curta.

Na relação de LGPD, a assistência é a controladora dos dados dos clientes finais e o Bancada é
o operador.

## Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Ambiente de desenvolvimento, CI, decisões registradas | concluída |
| 1A | Modelo de dados, máquina de estados e painel administrativo | concluída |
| 1B | API e telas em React: login, lista de OS, abertura e mudança de status | concluída |
| 1C | Página pública de acompanhamento | concluída |
| 1D | Fotos do aparelho e trava no banco (RLS) | concluída |
| 2A | Aviso ao cliente por e-mail, em tarefa assíncrona | concluída |
| 2B | PDF da ordem de serviço | concluída |
| 2C | Auditoria da senha, purga automática e tarefas periódicas | concluída |
| 3A | Busca, filtros e paginação na lista de ordens | concluída |
| 3B | Painel com os números do dia | concluída |
| 3C | Papéis, permissões e gestão da equipe | concluída |
| 4A | Cadastro da assistência, convite da equipe e recuperação de senha | concluída |
| 4B | Assinatura pelo Asaas, com teste grátis de 30 dias | |
| 4C | Tutorial guiado e canal de contato | |
| 4D | Pagamento na entrega e painel completo da loja | |
| 4E | Painel da plataforma, exclusivo do Henrique | |
| 4F | Publicação: domínio, página inicial, termos, backup e monitoramento | |
| 5 | Inteligência artificial: tradutor técnico, triagem assistida, busca no histórico | |
| 6 | WhatsApp, relatórios além do painel, estoque de peças | |

A Fase 1 termina quando uma assistência real conseguir abrir uma ordem de serviço e enviar o
link ao cliente. Nada que não sirva a essa frase entra antes.

A Fase 4 termina quando uma assistência que nunca falou com a gente conseguir se cadastrar,
montar a equipe, aprender a usar o sistema e assinar, tudo sozinha.

Até a Fase 3, o roadmap previa inteligência artificial na Fase 4, cobrança na 5 e publicação na 6.
O lançamento passou para a frente da inteligência artificial, e os ADRs escritos antes dessa
mudança usam a numeração antiga: as Fases 5 e 6 citadas neles fazem parte hoje da Fase 4, e a
Fase 4 citada neles é hoje a Fase 5.

O cache que a Fase 2 previa foi entregue antes, na Fase 1C: a leitura da página pública passa por
cache no Redis, no formato cache-aside, com invalidação por sinal. Nada mais no sistema tem hoje
volume de leitura que justifique cache, e cache sem necessidade só acrescenta caminhos para o
dado ficar velho.

## Fase 4: lançamento self-service

### Como a assistência chega ao produto

O Bancada é vendido à distância. A assistência recebe uma mensagem com o link, se cadastra, testa
e assina sem que ninguém vá até a loja, e a conversa sobre o que melhorar acontece pelo WhatsApp.
Tudo que um vendedor presente resolveria precisa, então, estar dentro do próprio produto: criar a
conta, montar a equipe, recuperar a senha, aprender as telas, pagar e pedir ajuda.

### 4A — Cadastro e contas

- O dono cria a assistência num formulário só: nome da assistência, nome dele, e-mail, WhatsApp,
  senha e aceite dos termos de uso. O formulário cria a assistência, a primeira loja e a conta do
  dono de uma vez, já dentro do teste grátis.
- O e-mail do dono é confirmado por link, sem bloquear o uso durante o teste. É por ele que chegam
  a recuperação de senha e as cobranças.
- O login passa a ser por e-mail. Hoje o nome de usuário é único no sistema inteiro (ADR 0016), o
  que não funciona quando cada assistência cria as próprias contas.
- Para adicionar um funcionário, o dono informa só o nome e o papel e recebe um link de convite
  para mandar pelo WhatsApp ou por e-mail. O funcionário abre o link, informa o próprio e-mail e
  cria a senha. A gestão da equipe da Fase 3C continua valendo: trocar papel e desativar conta.
- "Esqueci minha senha" por e-mail, para qualquer usuário.
- O dono edita os dados que aparecem para o cliente no comprovante, no recibo e nos avisos: nome
  da assistência, CNPJ, WhatsApp, e nome, telefone e endereço da loja. Sem isso, uma assistência
  que se cadastrou sozinha ficaria com o comprovante sem endereço.
- A abertura de ordem cadastra cliente e aparelho na mesma tela, com busca por nome ou telefone.
  Até aqui só existiam clientes criados pelo painel administrativo ou pelos dados de exemplo, e
  uma assistência nova não conseguia abrir nenhuma ordem.
- O orçamento é montado na tela da ordem, item por item, e trava quando é enviado ao cliente. Na
  aprovação, quem atende desmarca o que o cliente recusou. Até aqui os itens também só nasciam
  pelo painel administrativo, e nada marcava o que foi aprovado (ADR 0019).

### 4B — Assinatura pelo Asaas

- Toda assistência nova começa com 30 dias grátis, sem pedir forma de pagamento no cadastro.
- Nos últimos dias do teste, o dono recebe aviso na interface e por e-mail, e assina dentro do
  próprio sistema. A cobrança mensal é gerada pelo Asaas e paga por PIX, boleto ou cartão.
- A assinatura segue a máquina de estados do ADR 0006: `trial → ativa → inadimplente → suspensa →
  cancelada`. O webhook do Asaas tem a assinatura verificada e é idempotente.
- Inadimplente tem período de tolerância com aviso. Suspensa, ou teste vencido sem assinatura,
  passa a somente leitura. Os dados nunca são apagados por falta de pagamento.
- O dono tem uma tela com a situação da assinatura, as faturas e a forma de pagamento. Técnico e
  atendente não veem essa tela.
- O desenvolvimento usa o ambiente de testes do Asaas, que é gratuito.

### 4C — Tutorial guiado e contato

- No primeiro acesso a cada tela principal, um tour destaca os botões um de cada vez, dizendo o
  que cada um faz e o que fazer em seguida: lista de ordens, abertura de ordem, detalhe da ordem,
  painel e equipe.
- O tour mostra só o que o papel do usuário enxerga: o do atendente não apresenta botões que ele
  não pode usar.
- O tour pode ser pulado e reaberto a qualquer momento pelo menu. O sistema guarda quais tours cada
  usuário já viu, para não repeti-los quando ele entrar por outro aparelho.
- Uma lista de primeiros passos acompanha o começo do teste: abrir a primeira ordem, mandar o link
  ao cliente, convidar a equipe e assinar.
- Um botão "Fale com a gente" abre o WhatsApp do Henrique já com o nome da assistência na mensagem.

### 4D — Pagamento na entrega e painel completo da loja

O painel da Fase 3B mostra o estado de agora. Esta fase passa a registrar o dinheiro que de fato
entra no caixa e acrescenta resumos por período.

- Ao marcar a ordem como entregue, quem atende informa o valor recebido e a forma de pagamento:
  PIX, dinheiro, débito ou crédito. O valor já vem preenchido com o total aprovado e só é mudado
  quando há desconto. O pagamento pode ser dividido em mais de uma forma, e o aparelho entregue
  sem pagamento fica registrado como valor a receber até ser quitado.
- O recibo de entrega em PDF da Fase 2B passa a mostrar o valor pago e a forma de pagamento.

Com esse registro, o painel passa a ter:

- Escolha de período: hoje, últimos 7 dias, mês e intervalo personalizado, com comparação com o
  período anterior.
- Dinheiro: valor recebido no período, separado por forma de pagamento; descontos dados; valores a
  receber; ticket médio; valor aprovado ainda em aberto e taxa de aprovação de orçamentos.
- Operação: ordens abertas e entregues, atrasadas, tempo médio de reparo e tempo parado em cada
  etapa.
- Equipe: ordens concluídas e valor recebido por técnico.
- Atendimento: marcas e modelos mais atendidos, defeitos mais comuns e clientes que mais voltam.
- Filtro por loja, para assistências com mais de uma.
- Os números de dinheiro aparecem só para o dono. Técnico e atendente veem a parte de operação.

### 4E — Painel da plataforma

Uma área separada, visível apenas para a conta do Henrique.

- Dinheiro: receita recorrente mensal, valor recebido no mês, taxas do Asaas, custos do mês
  (servidor, domínio, e-mail e outros, registrados à mão) e lucro.
- Assinaturas: quantas estão em teste, ativas, inadimplentes, suspensas e canceladas; conversão de
  teste para assinatura; cancelamentos no mês.
- Crescimento: cadastros novos por semana e evolução da receita mês a mês.
- Uso: lista de assistências com dono, WhatsApp, data de cadastro, situação da assinatura, ordens
  abertas no período e último acesso. Ficam em destaque quem se cadastrou e não abriu nenhuma
  ordem e quem parou de usar, e um clique abre o WhatsApp do dono.
- Um e-mail avisa o Henrique a cada cadastro novo.

Este painel lê dados de todas as assistências, então atravessa o isolamento por RLS (ADR 0009) por
um caminho próprio, explícito e registrado em auditoria. Ele mostra números e o contato do dono,
nunca dados dos clientes finais das assistências.

### 4F — Publicação

- Domínio e HTTPS.
- Servidor com entrega contínua: o que passa na CI na `main` vai para produção.
- Backup diário do banco e das fotos, com restauração testada.
- E-mail por provedor com domínio verificado (ADR 0011) e armazenamento das fotos em produção
  (ADR 0010).
- Endereço de origem lido corretamente atrás do proxy e trava de instância única do Celery Beat,
  as duas pendências do ADR 0013.
- Monitoramento de erros e de disponibilidade.
- Asaas em produção.
- Página inicial com o botão "Testar grátis", termos de uso e política de privacidade, deixando
  claro que o Bancada é o operador dos dados dos clientes finais.

### Decisões em aberto

Ficam para quando cada parte chegar:

- Preço da assinatura e se haverá mais de um plano.
- Documentos que o Asaas exige para receber (CPF ou CNPJ) e emissão de nota fiscal.
- Nome do domínio.
- Provedores de servidor, e-mail, armazenamento e monitoramento.
- Fuso horário por assistência. Hoje as telas, os documentos e o agendador usam o horário de
  Brasília; uma assistência em Manaus veria as horas uma hora adiantadas.
