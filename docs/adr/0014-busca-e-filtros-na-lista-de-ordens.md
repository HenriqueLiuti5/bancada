# 0014 — Busca e filtros na lista de ordens

## Contexto

A lista de ordens mostrava tudo, da mais recente para a mais antiga, sem busca e sem filtro. Isso
funciona na décima ordem e não funciona na ducentésima. O atendente precisa responder "e o celular
da dona Maria?" com o cliente ao telefone, e o técnico precisa saber o que está atrasado antes de
escolher o que fazer agora.

## Decisão

### Como se busca

Um único campo procura por nome do cliente, marca, modelo, defeito relatado, telefone, IMEI e
número da OS. Um campo só, porque quem atende não sabe de antemão em qual coluna está o que ele
lembra do cliente.

A busca por número aceita `#12`, já que é assim que as pessoas escrevem. Telefone e IMEI são
comparados só pelos dígitos, então `(11) 99999-0000` encontra `11999990000`.

Dois mínimos protegem o resultado de virar lixo: telefone só entra na busca a partir de quatro
dígitos, e IMEI a partir de seis. Isso veio de um teste que falhou: procurar por `#2` trazia também
uma ordem cujo IMEI continha o algarismo 2 em algum lugar. Fragmento curto de número é número de
OS, não pedaço de IMEI.

### Como se filtra

Quatro atalhos cobrem o uso diário — todas, abertas, atrasadas, encerradas — e os demais filtros
ficam em campos: status, técnico responsável e ordenação. "Atrasada" é ordem não encerrada cuja
data prometida já passou; ordem entregue nunca conta como atrasada, por mais que tenha estourado o
prazo.

Todo o estado dos filtros vive na URL, e não em memória do navegador. A consequência prática é que
a busca é compartilhável e favoritável, o botão voltar funciona, e a página continua renderizada no
servidor. Não entrou nenhuma biblioteca de estado no cliente: a página lê os parâmetros, chama a
API e desenha o resultado.

A filtragem acontece no banco, nunca em memória: a API recebe os parâmetros, monta a consulta e
devolve uma página de 25 resultados. Isso mantém o custo constante, mesmo quando a assistência
tiver anos de histórico.

O vocabulário do domínio continua num lugar só. Os status e as ordenações são servidos por um
endpoint de catálogo, montado a partir das `TextChoices` do Django, em vez de repetidos em
português dentro do React.

## Consequências

A busca usa `ILIKE %texto%`, que não aproveita índice comum. É uma escolha consciente: com o
isolamento por tenant, cada assistência enxerga apenas a própria fatia, que são milhares de linhas,
e varrer isso no Postgres custa milissegundos. Quando passar a doer, a saída é o `pg_trgm`, que
permite índice GIN exatamente para busca por trecho, e já está a uma extensão de distância — o
banco é o mesmo que já carrega o pgvector para a Fase 4.

Uma página inexistente na URL, como `?page=99`, faz a API responder 404. Em vez de mostrar erro, a
tela redireciona para a primeira página preservando os filtros.

Os filtros com `select` se aplicam sozinhos ao mudar, por comodidade, mas o formulário continua
sendo um formulário: sem JavaScript, o botão de buscar faz o mesmo trabalho.

O endpoint de catálogo é mais uma chamada por carregamento da lista. Ele é pequeno e constante, e
entra na fila de coisas a colocar em cache se algum dia aparecer no perfil de desempenho.

## Alternativas consideradas

`django-filter` faria esse trabalho com menos código nosso e é a escolha mais comum no ecossistema
DRF. Foi descartado por enquanto porque os filtros aqui têm regras próprias — "atrasada" é uma
combinação de duas condições, a busca mistura texto e dígitos com mínimos diferentes — e expressar
isso na biblioteca acabaria custando mais do que a função direta, além de trazer uma dependência
para resolver algo que hoje cabe em setenta linhas testáveis.

Busca textual completa do Postgres, com `tsvector`, foi considerada e adiada. Ela é melhor para
texto corrido, como o defeito relatado, e pior para o que mais se procura aqui: pedaço de nome,
pedaço de telefone, pedaço de IMEI. `pg_trgm` atende melhor esse formato, e nenhum dos dois é
necessário agora.

Filtrar no cliente, trazendo todas as ordens de uma vez, seria mais simples de escrever e passaria
a impressão de ser mais rápido. Foi descartado porque não escala, porque transferiria para o
navegador dados que o usuário não vai ver, e porque a paginação da API já existe.
