# 0026 — Página inicial e demonstração

## Contexto

O Bancada é vendido à distância (Fase 4): a assistência recebe uma mensagem com um link, entende o
que é o sistema, se cadastra e testa sozinha. Até aqui esse link não tinha para onde apontar. O
endereço principal só redirecionava para a lista de ordens, e quem não tinha conta caía direto na
tela de login, sem saber o que estava olhando.

A lista da 4F previa uma "página inicial com o botão Testar grátis". Ela virou uma fase própria, a
4H, que vem antes da publicação, como a 4G. A referência foi a página da Inforos, outro sistema de
ordem de serviço: não a aparência, mas as técnicas que ela usa para convencer quem chega. A
aparência segue a identidade do Bancada (ADR 0024).

## Decisão

**Endereço.** A página inicial fica em `/`. Quem não tem sessão vê a página; quem tem continua indo
direto para a lista de ordens, agora pelo `proxy.ts`, que já cuidava das outras rotas sem login. A
página mora num grupo de rotas, `app/(inicio)`, junto com as próprias seções, as imagens e a imagem
de prévia do link. O grupo não aparece no endereço.

**Técnicas adotadas.** Cada uma tem o mesmo papel que na Inforos:

- **Título que promete um resultado**, não uma lista de recursos: "Sua assistência organizada, do
  balcão à entrega".
- **Risco zero ao lado de cada botão:** "30 dias grátis · Sem cartão de crédito · Sem instalar
  nada".
- **Recurso apresentado como dor resolvida, com a fala do cliente:** "Chega de 'e aí, já ficou
  pronto?'", "Fotos na entrada encerram a discussão do arranhão", "A senha do cliente longe do
  papel", "Você sabe quanto entrou e quem ainda deve".
- **O visitante se reconhece numa fase:** sozinho no balcão, com técnico e atendente, mais de uma
  loja.
- **Preço aberto**, com tudo o que vem incluso e as condições: pagamento, cancelamento e o que
  acontece se não assinar.
- **Perguntas frequentes que respondem às objeções:** o teste, o que acontece sem assinar, se o
  cliente precisa de aplicativo, instalação, quantas pessoas usam, como começar vindo do papel,
  segurança, pagamento e cancelamento.
- **Chamada final que traz a promessa para hoje**, numa faixa preta como a barra lateral do sistema.
- **WhatsApp com mensagem pronta**, pelo mesmo número de suporte do sistema
  (`WHATSAPP_DO_SUPORTE`). Sem o número configurado, os botões de WhatsApp não aparecem.

**Prova social sem invenção.** A Inforos mostra números de clientes e depoimentos em vídeo. O
Bancada ainda não tem clientes, e inventar números ou depoimentos seria propaganda enganosa, além
de derrubar a confiança de quem percebesse. No lugar disso, a página mostra o próprio produto: telas
reais do sistema e uma demonstração da página do cliente que o visitante abre no celular. A seção de
depoimentos entra quando houver clientes reais e eles autorizarem.

**Demonstração.** `/demonstracao` mostra a página que o cliente final recebe, com uma ordem de
exemplo da "Sua Assistência", para o dono imaginar o nome da própria loja ali. Cinco botões trocam a
etapa (recebido, orçamento, reparo, pronto e entregue), e a etapa escolhida fica no endereço. Para a
demonstração ser idêntica à página real, a página do cliente saiu de `app/os/[token]/page.tsx` para o
componente `componentes/Acompanhamento.tsx`, usado pelas duas. Os dados de exemplo são montados na
hora, com horários relativos ao momento da visita, sem nenhuma loja nem ordem no banco. Os botões de
ligar e de WhatsApp aparecem, mas não fazem nada, e um aviso explica que na página real eles chamam
a loja.

**Preço vindo da API.** O valor da mensalidade e os dias de teste vêm de `GET /api/publico/oferta/`,
que lê a mesma configuração usada na cobrança (`VALOR_DA_ASSINATURA` e `DIAS_DE_TESTE`). Assim a
página nunca mostra um preço diferente do cobrado. A rota não pede login e não consulta o banco, e o
Next guarda a resposta por 5 minutos.

**Telas do sistema.** As imagens são capturas reais, feitas com um navegador automatizado, em
resolução dobrada, sobre os dados de demonstração (`make semear` e `make semear-movimento`): a lista
de ordens e a parte de dinheiro do painel, num período com movimento. As telas do cliente vêm da
demonstração. Ficam fora das capturas o aviso de assinatura da loja de exemplo e a logo enviada para
ela nos testes, que traz marcas de terceiros. As imagens ficam em `app/(inicio)/telas/`, e o Next as
entrega já convertidas para WebP ou AVIF e no tamanho de cada tela. Na versão de produção, a lista
de ordens cai de 317 KB para 15 KB no celular.

**Aparência.** A ADR 0024 vale inteira: seções alternando branco e cinza, botões verdes em pílula,
ícones Phosphor cinza, preço em verde e nada transparente. O topo fica preso ao rolar a página, com
fundo sólido. Os blocos entram deslizando quando aparecem na tela, só com CSS, onde o navegador
suporta; quem pediu ao sistema para reduzir movimento vê tudo parado. As perguntas abrem com
`<details>`, que funciona com teclado e sem JavaScript.

**Busca e prévia do link.** A página tem título e descrição pensados para busca, dados estruturados
de aplicativo com o preço e uma imagem de prévia de 1200 × 630, que é o que o WhatsApp mostra quando
alguém manda o link. A imagem fica no grupo `(inicio)`, então vale só para a página inicial: a
página do cliente continua mostrando a logo da loja na prévia (ADR 0025). `robots.txt` e
`sitemap.xml` são gerados a cada pedido a partir de `APP_PUBLIC_URL`. A página do cliente e a
demonstração pedem para não ser indexadas, e o `robots.txt` também afasta os buscadores dos links de
acompanhamento, das fotos e das logos. A imagem de prévia, o `robots.txt` e o `sitemap.xml` passam
pelo `proxy.ts` sem login, porque quem os busca não tem sessão.

**Caminho de volta.** A marca nas telas de login, cadastro, convite e recuperação de senha, e nos
textos legais, passou a levar à página inicial.

## Consequências

As capturas não se atualizam sozinhas. Se a lista de ordens, o painel ou a página do cliente
mudarem, as imagens precisam ser refeitas, com o mesmo cuidado de esconder o aviso de assinatura e de
não mostrar a logo da loja de exemplo.

O cartão "Fotos e comprovante" não tem imagem: as fotos dos dados de exemplo são placas com texto.
Ele ganha imagem quando houver fotos reais de um aparelho no balcão ou de um comprovante impresso.

A fase "mais de uma loja" depende do Henrique: não existe tela para criar a segunda loja, que hoje é
cadastrada no painel administrativo. Por isso a página diz para pedir pelo WhatsApp.

O cadastro e a tela de acesso escreviam "30 dias" no próprio texto e passaram a ler a mesma rota.
Nessas telas, se a API não responder, o texto diz só "Teste grátis" e a tela abre do mesmo jeito,
porque o login precisa continuar aparecendo. A página inicial e a demonstração dependem do preço e
mostram a página de erro nesse caso; como o Next guarda a última resposta, isso só acontece se a API
estiver fora do ar desde que o site subiu.

A página não mede visitas. Medir quem chega e quem se cadastra só faz sentido com o site no ar e,
dependendo da ferramenta, exige aviso de cookies; fica para a 4F.

O layout raiz lê o cookie do tema, então nenhuma página é estática, a inicial inclusive. Mesmo
assim, ela é gerada em cerca de 60 ms na versão de produção. Quem escolheu o modo escuro no sistema e
saiu da conta vê a página inicial escura.

## Alternativas consideradas

**Uma loja e uma ordem de demonstração no banco.** A demonstração seria a página real de uma ordem
de verdade. Foi descartada porque a loja falsa entraria no painel da plataforma, nas contas de
assinaturas e nas tarefas periódicas, e porque a ordem precisaria existir igual em cada ambiente.
Com o componente compartilhado, a demonstração mostra a mesma página sem nenhum dado guardado.

**Cadastro em forma de questionário**, como na Inforos, com perguntas sobre a equipe e o maior
desafio antes do nome e do contato. Lá o acesso é enviado à mão pelo WhatsApp; aqui o cadastro já
libera o sistema na hora, e cada pergunta a mais é um motivo para desistir no meio.

**Janela "Espera!" quando o visitante vai sair.** Só funciona com mouse, e quem chega por um link do
WhatsApp está no celular. Também precisaria do fundo escurecido que a ADR 0024 descartou.

**Preço escrito na página.** Mais simples, mas a página e a cobrança poderiam divergir no dia em que
o preço mudasse.

**Desenhos das telas em vez de capturas.** Um desenho nunca fica velho, mas não mostra o sistema de
verdade, que era o motivo de ter imagens.
