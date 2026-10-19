# 0033 — Testes automáticos do site

## Contexto

Até a Fase 4L, só a API tinha testes. O site passava pela verificação do código, dos tipos e da
montagem, mas nada abria as telas. Cada fase era conferida à mão, com um Chrome sem janela guiado
por script, e um erro numa tela só aparecia quando alguém a usava. As fases seguintes, da 4N à 4R,
mexem justamente nas telas: cliente da ordem, histórico, lojas, fuso horário, estoque e financeiro.

## Decisão

**Funções do site, com Vitest.** As funções de `apps/web/src/lib` que conferem e formatam dados
ganharam testes ao lado de cada arquivo (`telefone.test.ts`):

- telefone: os 67 DDDs comparados com a lista da Anatel, celular sem o 9, fixo, +55 e 0 de longa
  distância, e cada mensagem de erro;
- dinheiro: o que a pessoa digita ("1.234,56", "R$ 90", "150,5"), o que é recusado e os centavos
  sem erro de arredondamento;
- CPF e CNPJ, inclusive o CNPJ com letras;
- datas: o dia de Brasília mesmo com o servidor em UTC, as viradas de mês e de ano, fevereiro
  bissexto e o mesmo resultado em UTC e nos quatro fusos do Brasil;
- link do WhatsApp, erros da API nos formulários, o que cada papel pode fazer, convites, a
  demonstração da página do cliente e o aviso de erros ao monitoramento, que não pode levar dado de
  quem acessou (ADR 0032).

Três testes conferem valores que o site e a API repetem, cada um no seu código: os DDDs aceitos, a
versão dos termos e o tamanho máximo da foto. Eles leem o código da API e reprovam quando um lado
muda sem o outro. Os testes rodam com `npm test` em menos de um segundo, e a CI os roda no job
`web`, antes da montagem.

**O site num navegador de verdade, com Playwright.** Os testes de `apps/web/e2e` abrem o site no
Chromium e fazem o caminho de uma assistência nova:

1. cria a conta pelo cadastro, sai e entra de novo com o e-mail e a senha;
2. abre uma ordem com cliente e aparelho novos, conferindo a máscara e a conferência do telefone;
3. envia uma foto do aparelho e confere que a imagem carrega;
4. monta o orçamento com uma peça e um serviço, envia ao cliente e registra a aprovação;
5. começa o reparo, marca pronto e entrega, com o pagamento dividido entre PIX e dinheiro, e
   confere o histórico;
6. baixa o comprovante e o recibo em PDF;
7. apaga os cookies e abre a página do cliente: saudação, orçamento aprovado, foto e todas as
   etapas do andamento. Em seguida confere que as telas internas pedem login.

Outro arquivo abre as páginas públicas (início, cadastro, login, termos e privacidade) e passa pelas
cinco etapas da demonstração. Tudo roda duas vezes, num computador (1366×900) e num celular
(Pixel 7), porque o balcão usa os dois e a arrumação das telas muda entre eles.

Cada execução cria a própria assistência, com e-mail único, e não depende dos dados de exemplo nem
da ordem dos testes. O tour que abre na primeira visita de cada tela toma o foco da página, então o
teste o fecha em "Pular o tour" e espera o sistema registrar isso antes de seguir. A foto enviada é
um PNG montado pelo próprio teste, sem arquivo de imagem no repositório.

Qualquer erro no console do navegador reprova o teste: violação da CSP, imagem que não carrega,
resposta de erro ou exceção que a página não tratou. A trava foi conferida com dois testes errados
de propósito, uma imagem de outro site e uma exceção solta, e os dois reprovaram.

**Na CI, sobre as imagens de produção.** O job `producao` já montava as imagens, criava os papéis do
banco, migrava e subia a API e o site como no servidor. Agora, antes do backup, ele instala o
Playwright e roda os testes contra esse site. Assim eles passam pelo mesmo `next build`, pela CSP de
produção, pelo gunicorn e pelo papel do banco sem privilégios que vão para o ar, e a geração de PDF
da imagem de produção, que nenhum teste exercitava, passou a ser conferida. Se algo falhar, o
relatório do Playwright, com a tela no momento do erro e o rastro de cada passo, fica sete dias nos
artefatos da execução. Na CI, um teste que falha roda mais uma vez antes de reprovar o job.

**Na máquina.** `npm test` e `npm run e2e`, dentro de `apps/web`. O Playwright abre por padrão o
ambiente de desenvolvimento, em http://localhost:3000, e `ENDERECO_DO_SITE` aponta outro endereço.
Antes da entrega, os testes passaram no desenvolvimento, na produção local direto no Next e na
produção local atrás do Caddy, em HTTPS. O caminho da ordem foi repetido oito vezes, quatro em cada
tamanho de tela, sem falhar.

**Aviso do `braces` (ADR 0029).** Conferido de novo em 18 de outubro de 2026. O aviso
GHSA-vfj7-8cjw-p6xm, de setembro, vale para todas as versões até a 3.0.3, que é a última, e não tem
correção. O `braces` chega só pelo plugin de lint do Next, também na versão mais nova dele (16.4.2),
e não está na imagem de produção; a auditoria das bibliotecas de produção continua sem falhas.
Vitest e Playwright não trouxeram aviso novo. Segue como antes: só no desenvolvimento, à espera de
uma versão corrigida.

## Consequências

Cada execução contra o ambiente de desenvolvimento deixa no banco local uma assistência "Assistência
Teste …" com uma ordem entregue. O `make clean` apaga o banco local inteiro.

O limite de 10 cadastros por hora por endereço vale também para os testes. Cada execução completa
cria duas assistências, uma por tamanho de tela, então mais de cinco execuções na mesma hora contra
o mesmo ambiente esbarram no limite.

O `@types/node` foi da 20 para a 22, a versão do Node das imagens e da CI, que o Vitest 5 pede.

As fases seguintes acrescentam testes junto com as telas que mudam.

## Alternativas consideradas

**Cypress.** Roda dentro do navegador e cobra pelo painel que divide os testes entre máquinas. O
Playwright roda em Node, abre contextos isolados, o que permitiu ver a página do cliente sem os
cookies da assistência, e grava o rastro de cada passo sem serviço externo.

**Testes de componentes, com a API simulada.** Testam cada peça da tela isolada. O que mais quebra no
Bancada é a ligação entre a tela, a ação do servidor e a API, e só o navegador contra o sistema
inteiro passa por ela.

**Usar os dados de exemplo do `semear`.** Os testes dependeriam do que o comando cria e do estado em
que a execução anterior deixou o banco. Com o cadastro a cada execução, eles também cobrem a chegada
de uma assistência nova pelo site.

**Testes do navegador no job `web`, com `next start`.** Precisariam de API, banco e Redis no job. O
`producao` já tem tudo isso rodando do jeito que vai para o servidor.

**Só no tamanho de computador.** No celular, o menu vai para baixo, a ficha da ordem fica abaixo do
cartão de ação e os botões ocupam a largura toda. Um teste só no computador não veria essas telas.
