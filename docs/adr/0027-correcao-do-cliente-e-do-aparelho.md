# 0027 — Correção do cliente e do aparelho

## Contexto

Cliente e aparelho são cadastrados na abertura da ordem, no balcão (ADR 0018), quase sempre com
pressa. Até a Fase 4I, nenhuma tela corrigia o que fosse anotado errado. O erro mais caro era o do
e-mail: com uma letra trocada, os avisos de cada etapa (ADR 0011) se perdiam ou iam para outra
pessoa, e a assistência só consertava pedindo ao Henrique que mexesse no painel administrativo.
Telefone, IMEI e senha de desbloqueio tinham o mesmo problema.

A API já aceitava a edição de clientes e de aparelhos, mas nenhuma tela a usava, e ela tinha três
brechas: qualquer papel trocava a senha de desbloqueio sem deixar registro, o IMEI corrigido era
gravado com traços e espaços, e um aparelho podia passar para outro cliente, o que deixaria a ordem
apontando para um cliente e um aparelho de pessoas diferentes.

## Decisão

**Onde.** O cartão Propriedades da ordem ganhou o botão "Editar", que leva à tela Cliente e
aparelho, em `/ordens/<id>/cliente`. São dois formulários, cada um com o seu botão Salvar, como na
tela Assistência: nome, telefone, e-mail e CPF do cliente; marca, modelo, cor e IMEI do aparelho. As
regras são as da abertura: telefone com DDD, guardado só com os números, e IMEI só com os números.

**Quem.** Qualquer papel corrige cliente e aparelho, porque quem cadastra no balcão costuma ser o
atendente. No modo só de consulta (ADR 0022), nada muda.

**O cadastro, não uma cópia.** A correção altera o próprio cliente e o próprio aparelho, que são os
mesmos em todas as ordens deles. Por isso vale também para as ordens antigas: o recibo reimpresso de
uma ordem entregue sai com o telefone novo. A tela diz isso logo abaixo do título. O histórico da
ordem continua mostrando o endereço para onde cada aviso foi de fato.

**Senha de desbloqueio.** Ela não está na tela Cliente e aparelho. É corrigida no cartão da senha,
na tela da ordem: depois de revelar, técnico e dono veem "Corrigir senha", ou "Cadastrar senha" se
não havia nenhuma. Na API, só técnico e dono trocam a senha de um aparelho já cadastrado, e o
atendente recebe 403, como na consulta. Cada troca grava `senha_alterada` na auditoria (ADR 0013),
com quem e quando; salvar a mesma senha não grava nada. O botão só aparece com a ordem aberta,
porque depois da entrega a senha está a caminho da purga.

**Aparelho preso ao cliente.** A API recusa trocar o cliente de um aparelho já cadastrado.

**Página do cliente.** A página de acompanhamento mostra o primeiro nome do cliente e o aparelho, e
fica sessenta segundos em cache (ADR 0008). Salvar um cliente ou um aparelho apaga o cache de todas
as ordens dele, como já acontecia com status, orçamento e fotos.

## Consequências

Corrigir os dados de quem não é o cliente da ordem estraga o cadastro de outra pessoa. Se o
atendente escolheu "Maria Silva" na busca quando o certo era "Maria Souza", sobrescrever nome e
telefone transforma a Maria Silva, com todas as ordens dela, na Maria Souza. O aviso abaixo do título
é a única proteção por enquanto.

O atendente deixou de poder trocar a senha pela API, o que antes acontecia sem registro. Na abertura
com aparelho novo, ele continua anotando a senha que o cliente informa. Na abertura com um aparelho
que já estava cadastrado, a tela não pede a senha, e a da visita anterior já foi apagada pela purga;
quem a cadastra agora é o técnico ou o dono, no cartão da senha.

## Alternativas consideradas

**Formulário dentro do cartão Propriedades.** O cartão fica na coluna estreita da direita, e oito
campos ali ficariam espremidos, principalmente no celular. Uma tela própria segue o padrão da tela
Assistência.

**Janela por cima da tela da ordem.** Precisaria escurecer o fundo, o que a identidade visual
descarta (ADR 0024).

**Senha no formulário do aparelho.** Seria um campo vazio, com "deixe em branco para manter", sem
mostrar a senha atual, e separaria a correção do lugar onde a senha é consultada e registrada.

**Trocar o cliente da ordem.** Resolveria o caso da Maria Silva, mas é outra operação: mudar a quem
a ordem pertence, com reflexo nos avisos, no link e no histórico. Fica para quando uma assistência
precisar.

**Página de clientes, com lista e histórico.** A busca da lista de ordens por nome ou telefone já
mostra o histórico de um cliente.
