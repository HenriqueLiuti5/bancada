# 0008 — Página pública de acompanhamento

## Contexto

Cada ordem de serviço gera um link que a assistência envia ao cliente final. Quem abre esse link
não tem conta, não fez login e pode ser qualquer pessoa a quem o link foi repassado. É a única
superfície do sistema aberta à internet sem autenticação, e é também a de maior volume: uma
assistência dispara dezenas de links por dia e cada cliente recarrega a página várias vezes.

## Decisão

O acompanhamento é servido por um endpoint próprio, identificado por um token aleatório, com
quatro restrições desenhadas para essa exposição.

Primeiro, exposição mínima: a resposta carrega apenas o necessário para o cliente entender o
andamento. Não inclui IMEI, documento, sobrenome, nem as anotações técnicas internas. Existe um
teste que serializa a resposta inteira e falha se qualquer um desses valores aparecer.

Segundo, o orçamento só é revelado a partir do momento em que foi efetivamente enviado ao
cliente. Antes disso, o campo simplesmente não existe na resposta.

Terceiro, leitura com cache no Redis por sessenta segundos, invalidado por sinal sempre que um
evento ou item de orçamento é gravado. O cache é *cache-aside*: a ausência no Redis leva a uma
consulta ao PostgreSQL, então uma falha do cache deixa a página mais lenta, nunca errada.

Quarto, o link deixa de responder noventa dias após a entrega do aparelho, e há limite de
requisições por endereço de origem.

## Consequências

O caminho mais quente do sistema não toca o banco na maior parte das visitas, e o dado exposto é
pequeno o bastante para que o vazamento de um link custe pouco.

A página é renderizada no servidor. Isso importa por um motivo prático: o WhatsApp busca a página
para montar o cartão de prévia e não executa JavaScript. Com a renderização no servidor, quem
recebe o link vê o aparelho e a situação já na prévia da conversa.

O custo é que o cliente pode ver uma informação até um minuto defasada. Para um reparo que dura
dias, é irrelevante.

## Alternativas consideradas

Servir a página direto do banco a cada visita seria mais simples e funcionaria no volume atual,
mas desperdiçaria a única oportunidade barata de proteger o banco do tráfego público. Exigir que
o cliente confirme os últimos dígitos do telefone antes de ver o andamento foi considerado e
adiado: aumenta o atrito do produto e o dado exposto já é pequeno.
