# 0029 — Revisão de segurança antes da publicação

## Contexto

Antes da publicação (Fase 4F), o sistema foi comparado com uma lista de 50 itens de segurança para
projetos Django. A maior parte já estava coberta por decisões anteriores: o isolamento no banco
(ADR 0009), os papéis checados na API (ADR 0016), as fotos com link assinado (ADR 0010), a auditoria
(ADR 0013) e as contas self-service (ADR 0018). A revisão achou lacunas. Esta ADR registra o que foi
corrigido agora e o que ficou para a 4F, porque depende do servidor.

## Decisão

**Chave do Django obrigatória fora do desenvolvimento.** Sem `DJANGO_SECRET_KEY`, o Django usava
`insecure-dev-key` sem avisar. O repositório é público, então essa chave também é, e com ela
qualquer um assinaria links de foto e de logo de qualquer assistência. Com o `DEBUG` desligado, a
API agora se recusa a subir sem uma chave própria de pelo menos 50 caracteres, e recusa também os
valores de exemplo. No desenvolvimento nada muda. A CI ganhou uma chave de teste longa.

**Senha errada demais bloqueia o e-mail.** O limite do login, 20 tentativas por minuto, contava só
por endereço. Agora, 10 senhas erradas para o mesmo e-mail bloqueiam esse e-mail por uma hora, venha
de onde vier a tentativa, e um login certo zera a contagem. E-mail sem conta é bloqueado do mesmo
jeito, para o bloqueio não revelar quem tem cadastro. Quem for bloqueado usa "Esqueci minha senha",
que já abre a sessão ao trocar a senha. Cada senha errada de uma conta que existe vai para a
auditoria como `login_recusado`, com o endereço de origem.

**O token de login vence.** A ADR 0007 deixava isso para a 4F, mas é só código. O token vale 30 dias
a partir de quando foi criado, o mesmo prazo do cookie no Next, e os dois valores precisam mudar
juntos. Vencido, a API responde 401 e o Next leva ao login com o aviso de sessão expirada, pelo
caminho que a ADR 0007 já descrevia. O login seguinte cria um token novo. Entrar por outro aparelho
continua reaproveitando o token, com a mesma validade: renovar a cada login derrubaria os outros
aparelhos da mesma pessoa.

**Endereço de quem acessa.** O Next repassava à API o primeiro valor do `X-Forwarded-For`, que é
escrito pelo próprio visitante. A página de acompanhamento e as rotas de fotos e de logos nem
repassavam o endereço, então os limites delas contavam todos os visitantes como um só. Agora toda
chamada do Next à API leva o último valor do cabeçalho (`src/lib/visitante.ts`): é o que o proxy
mais próximo do Next escreve ou, sem proxy, o da própria conexão. O Django lê a mesma posição, nos
limites de requisição (`NUM_PROXIES = 1`) e na origem da auditoria, que antes gravava o endereço do
container do Next.

**Limite de resolução e de quantidade nas imagens.** O limite de 10 MB não cobria o processamento:
um PNG desse tamanho pode ter quase 180 megapixels, e abri-lo passaria de 1 GB de memória. Agora o
JPEG é lido já reduzido pelo próprio decodificador, o que mantém leve a foto de uma câmera de 50
megapixels, e toda imagem que continuar acima de 25 megapixels é recusada antes de ser aberta. Vale
para fotos e logos. Cada ordem aceita até 30 fotos, contadas com a linha da ordem travada no banco,
e cada pessoa envia até 120 fotos por hora.

**Cabeçalhos de segurança no Next.** Quem conversa com o navegador é o Next, não o Django, então as
proteções do navegador ficam nele: Content-Security-Policy, proibição de abrir o site dentro de
outro (`frame-ancestors` e `X-Frame-Options`), `nosniff`, `Referrer-Policy` e nada de
`X-Powered-By`. A política ainda permite scripts escritos na própria página, porque o App Router
escreve os dele assim, mas bloqueia scripts de outras origens, plugins, troca do `<base>` e
formulários enviados para fora. A rota dos PDFs fica sem a política, porque os leitores de PDF dos
navegadores podem não abrir o documento com `object-src 'none'`. O HSTS sai do `proxy.ts` só quando
o pedido chegou por HTTPS, segundo o `X-Forwarded-Proto`: liga sozinho em produção e nunca no
ambiente local.

**Django sem cabeçalhos de navegador.** O `check --deploy` pedia HSTS e redirecionamento para HTTPS.
O Django só é chamado pelo Next, por HTTP, na rede interna: o redirecionamento quebraria esse
caminho, e HSTS numa resposta que o navegador nunca vê não serve para nada. Os dois avisos foram
silenciados em `settings.py`. Os cookies de sessão e de CSRF, usados só pelo painel administrativo,
passaram a ser `Secure` fora do desenvolvimento.

**Menos superfície.** Saiu o `django-cors-headers`: a ADR 0004 tinha acabado com a necessidade de
CORS, mas o pacote continuava instalado e liberando credenciais. Clientes e aparelhos deixaram de
aceitar `PUT`, como a ADR 0016 pede. O health check deixou de devolver a mensagem de erro do banco e
do Redis, que agora vai só para o log. No ambiente local, banco, Redis, API e site respondem só em
`127.0.0.1`.

**Auditoria das dependências.** Um workflow próprio roda `pip-audit` e `npm audit` sobre as
dependências de produção a cada push, a cada pull request e toda segunda-feira. O Next foi de 16.3.6
para 16.3.8, que corrige seis avisos, um deles alto (SSRF na otimização de imagens), e `sharp` e
`source-map-js` subiram com `npm audit fix`.

## Consequências

As sessões criadas há mais de 30 dias vencem no próximo uso, e a pessoa entra de novo.

Sobra um aviso só no ambiente de desenvolvimento: o `braces`, que o lint usa por meio do
`eslint-config-next`, não tem versão corrigida. A falha exige alguém controlando os padrões de
arquivo que o lint procura, e não chega ao servidor.

Abrir o site local pelo celular, na mesma rede, agora exige tirar o `127.0.0.1` da porta do `web` no
`docker-compose.yml`, sabendo que a porta fica aberta para a rede.

Ficam para a 4F, porque dependem do servidor:

- um proxy que acrescente o endereço real ao fim do `X-Forwarded-For`, ou que substitua o cabeçalho,
  com API, banco e Redis fora da internet. Sem isso, o último valor ainda pode ser inventado. Com
  uma CDN na frente do proxy, a regra precisa olhar um salto antes;
- o painel administrativo do Django acessível só por túnel SSH, porque o `/admin/` não tem limite
  de tentativas nem segundo fator;
- dois papéis no banco. Hoje o `bancada_app` é dono das tabelas, então poderia desligar o RLS, e
  pode criar bancos, coisa que só os testes usam. Em produção, um papel dono serve às migrações e
  outro, só com leitura e escrita, à aplicação;
- imagens de produção que não rodem como root;
- a `BANCADA_ENCRYPTION_KEY` guardada longe do backup do banco. Sem ela as senhas de desbloqueio do
  backup ficam ilegíveis, e guardada junto a criptografia não protege nada. Trocar a chave hoje
  exige regravar todas as senhas.

Os alertas do Dependabot estão desligados no GitHub. Ligar é uma configuração do repositório, em
Settings → Code security.

O segundo fator de login para a conta da plataforma ficou para depois do lançamento, e o plano de
resposta a incidentes ficou fora desta fase.

## Alternativas consideradas

**CSP com nonce.** Tiraria o `'unsafe-inline'` dos scripts, mas exige gerar um valor novo a cada
pedido no `proxy.ts` e renderizar toda página a cada pedido. O ganho fica para quando houver
conteúdo de terceiros na página.

**Bloquear por e-mail e endereço juntos.** Impediria alguém de bloquear o e-mail de outra pessoa,
mas quem espalhasse as tentativas por muitos endereços nunca seria barrado. A pessoa bloqueada tem o
"Esqueci minha senha".

**Token novo a cada login.** Derrubaria os outros aparelhos da mesma pessoa, porque o DRF guarda um
token só por usuário.

**Cota de armazenamento por assistência.** Seria a resposta definitiva para quem tentar encher o
disco, mas é recurso de produto, com limite por plano e tela própria. Os limites por ordem e por
pessoa seguram o abuso até lá.

**Auditoria das dependências dentro da CI.** Seria mais simples, mas um aviso publicado num domingo
pararia a entrega de segunda, e, enquanto não houvesse versão corrigida, tudo ficaria parado. No
workflow separado, a falha aparece no GitHub e chega por e-mail sem travar a entrega.
