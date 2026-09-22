# 0009 — Isolamento no banco com Row Level Security

## Contexto

O isolamento entre assistências vive hoje na camada de aplicação: uma classe base filtra toda
consulta pelo tenant do usuário autenticado. Isso funciona, mas depende de disciplina. Basta uma
view nova esquecer de herdar a base, ou uma consulta escrita à mão, para que dados de uma
assistência apareçam para outra.

## Decisão

As tabelas que pertencem a um tenant passam a ter Row Level Security do PostgreSQL, com uma
política que compara a coluna do tenant com uma variável de sessão. Antes de atender qualquer
requisição da API autenticada, essa variável recebe o tenant do usuário.

A política é permissiva quando a variável não está definida. Isso mantém funcionando tudo o que
roda fora do caminho da API: migrações, o painel administrativo, o shell e os comandos de
manutenção. Quando a variável está definida, ela é obrigatória, e uma requisição sem tenant
recebe o valor -1, que não corresponde a nenhum registro.

O endpoint público de acompanhamento não define a variável, porque ele busca uma ordem pelo token
sem saber de antemão a qual assistência ela pertence. Ele já é protegido por outras vias: o token
aleatório, a exposição mínima de dados e o limite de requisições.

## Descoberta que mudou o desenho

A primeira implementação não funcionou, e o motivo merece registro. O papel que a aplicação usava
era o mesmo criado pela imagem do PostgreSQL a partir de `POSTGRES_USER`, e esse papel é
**superusuário**. Superusuário ignora Row Level Security incondicionalmente, inclusive com
`FORCE ROW LEVEL SECURITY` ligado. As políticas existiam, estavam corretas e simplesmente não
tinham efeito.

Por isso existe agora um papel separado, `bancada_app`, sem poderes de superusuário, que é o
papel que a aplicação usa para tudo: requisições, migrações e testes. Ele é dono das tabelas, e é
para isso que serve o `FORCE`, já que sem ele o dono também passaria por cima da política.

## Consequências

Um esquecimento de filtro numa consulta deixa de ser vazamento e passa a ser resultado vazio. Há
testes que fazem exatamente isso: definem o tenant na sessão, executam uma consulta sem filtro
nenhum e verificam que só voltam registros daquele tenant, além de confirmar que uma escrita
dirigida a outro tenant é recusada pelo banco.

O custo é que a aplicação agora depende de um papel de banco criado fora das migrações. Isso vive
em `infra/postgres/init.sql`, usado tanto pelo ambiente local quanto pela integração contínua,
para que exista uma definição só.

Para que a variável de sessão sobreviva pela duração da requisição sem vazar para a requisição
seguinte, ela é definida como local a uma transação, e as requisições da API passaram a ser
transacionais. A leitura pública ficou de fora dessa regra, por ser somente leitura e o caminho
de maior volume.

## Alternativas consideradas

Uma política que negasse acesso quando a variável não estivesse definida seria mais rigorosa, mas
quebraria migrações e o painel administrativo, e exigiria uma exceção explícita em cada um desses
caminhos. O ganho seria pequeno: o risco real que o RLS endereça está nas consultas da API, e
essas sempre definem a variável.
