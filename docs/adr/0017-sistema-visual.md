# 0017 — Sistema visual

## Contexto

A interface nasceu tela a tela, cada arquivo com as próprias strings de classe do Tailwind —
`CAMPO`, `BOTAO`, `BOTAO_DISCRETO` redefinidos em quase todo componente. O resultado era um visual
que variava levemente de uma tela para outra, modo escuro escrito à mão em cada classe com `dark:`,
e cor usada como fundo translúcido: selos de status tingidos, caixas de erro avermelhadas, cartão
verde na página pública.

Havia também um defeito silencioso: o CSS apontava para a fonte Geist, mas ela nunca era
carregada. O sistema inteiro renderizava em Arial.

## Decisão

### Direção

Interface neutra, na linha de Linear, Vercel e Stripe: cinzas, bordas finas, tipografia com
hierarquia clara e cor reservada para significado. Nada de cor saturada, nada de fundo colorido
translúcido. A cor aparece em três lugares só: no ponto de status, no texto de erro e no ícone de
sucesso.

### Tokens

Todas as cores são variáveis CSS com nome de função, não de tom: `fundo`, `superficie`, `realce`,
`borda`, `texto`, `texto-suave`, `texto-apagado`, `primario`, `perigo`, `sucesso`. Cada uma tem
valor para o modo claro e para o escuro, e o Tailwind as expõe como classes (`bg-superficie`,
`text-texto-suave`). A consequência é que nenhum componente escreve `dark:` — o modo escuro vem de
graça, e trocar o tom de cinza do sistema inteiro é mudar uma linha.

### Status

Dez status com dez cores seriam ilegíveis — cores demais deixam de ser distinguíveis, sobretudo
para quem tem daltonismo. Os status são agrupados pelo que significam para quem está na bancada:

| Grupo | Status | Cor |
|---|---|---|
| Novo | recebido | azul |
| Em andamento | em diagnóstico, aprovado, em reparo | violeta |
| Esperando algo de fora | orçamento enviado, aguardando peça | âmbar |
| Pronto | pronto | verde |
| Encerrado | entregue, devolvido sem reparo | cinza |
| Recusado | reprovado | vermelho |

A cor aparece só num ponto pequeno ao lado do nome, dentro de um selo neutro. O nome está sempre
escrito, então a cor nunca é a única forma de saber o status.

### Componentes

As peças repetidas moram em `src/componentes/ui/`: botão (quatro variantes, dois tamanhos),
campo, seletor, área de texto, cartão, cabeçalho de página, selo, mensagem, estado vazio, linha do
tempo, avatar e a marca. Uma tela nova monta essas peças em vez de reescrever classes.

Estilos compostos passam pela função `juntar`, que usa o `tailwind-merge`. O motivo é um defeito
real encontrado nas capturas de tela desta mudança: um seletor recebia `w-full` do estilo base e
`w-auto` da tela, e no Tailwind qual das duas vence depende da ordem no CSS gerado, não da ordem em
que se escreve. Os três filtros da lista de ordens apareciam empilhados em largura total. Com
`juntar`, a última classe de cada propriedade sempre vence.

### Estrutura

As telas autenticadas têm uma barra lateral fixa no desktop — marca, assistência, botão de nova
ordem, navegação com ícones e o usuário no rodapé — e um cabeçalho com abas no celular. A tela da
ordem de serviço segue o padrão de telas de detalhe dos sistemas grandes: conteúdo de trabalho à
esquerda, propriedades e ações à direita. No celular a coluna de ações vem primeiro, porque mudar
o status é o que mais se faz ali.

Os ícones são do Lucide, com traço fino e tamanho único por contexto.

## Consequências

O visual passa a ser verificável: a revisão desta mudança foi feita com capturas de tela reais em
modo claro, modo escuro e celular, e foi assim que o defeito de largura dos seletores apareceu.

Duas dependências novas entram no frontend, `lucide-react` e `tailwind-merge`. Ambas são pequenas,
gratuitas e o Lucide só inclui no pacote final os ícones efetivamente usados.

A API passou a devolver o nome de exibição das pessoas (primeiro nome, ou o usuário quando não há
nome) em vez do nome de login, para a interface mostrar "Joana" e não "joana".

Os documentos em PDF da Fase 2B não mudaram. Eles têm o próprio estilo de impressão, que já era
neutro.

## Alternativas consideradas

Uma biblioteca de componentes pronta, como shadcn/ui ou Radix, traria mais peças de uma vez, como
menus suspensos e diálogos. Foi descartada por enquanto porque o sistema ainda usa poucas peças,
e porque copiar dezenas de componentes que ninguém usa dificultaria entender o que é do projeto.
Quando aparecer a necessidade de menus e diálogos acessíveis, Radix é o caminho natural, e os
tokens daqui continuam valendo.

Seletores customizados, desenhados do zero em vez do `select` nativo, dariam controle total da
aparência. O `select` nativo foi mantido, apenas com a seta redesenhada, porque no celular ele abre
o seletor do próprio sistema, que é melhor do que qualquer imitação.
