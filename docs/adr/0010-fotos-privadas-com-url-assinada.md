# 0010 — Fotos em armazenamento privado com URL assinada

## Contexto

A foto do aparelho na entrada é o registro que resolve a discussão mais comum de uma
assistência: "essa trinca já estava aí quando eu deixei o celular?". Por isso ela precisa chegar
ao cliente final, que não tem conta no sistema e acessa tudo por um link.

Ao mesmo tempo, foto de celular é dado pessoal, e por dois caminhos. O conteúdo pode revelar mais
do que se pretende — uma tela ligada, um papel com a senha ao lado do aparelho. E os metadados de
uma foto de celular normalmente carregam coordenadas de GPS, data, modelo e número de série da
câmera, invisíveis na imagem e presentes no arquivo. O plano do projeto já fixava a regra: bucket
privado e URL assinada de validade curta.

## Decisão

O arquivo nunca fica acessível por um caminho fixo. Não existe rota que sirva o diretório de
mídia, e a única porta de entrada é um endpoint que exige assinatura.

A assinatura é gerada com `TimestampSigner` sobre o identificador da foto, com sal próprio, e
vale 15 minutos. Ela viaja no corpo das respostas — no detalhe da ordem para quem trabalha na
assistência, e no acompanhamento público para o cliente — e é o que a página usa como endereço da
imagem.

O endpoint que entrega o arquivo não pede autenticação: a assinatura **é** a credencial, do mesmo
jeito que numa URL pré-assinada de um serviço de objetos. Quem recebe assinatura é decidido antes,
na camada que monta a resposta: o detalhe da ordem só existe para usuários da própria assistência,
e o acompanhamento público só assina as fotos marcadas como visíveis ao cliente.

Toda foto passa por uma normalização no envio, que é o único caminho de escrita: a imagem é
reaberta, tem a orientação da câmera aplicada, é reduzida para no máximo 1600px no lado maior e
regravada como JPEG. Isso descarta os metadados por construção, porque o arquivo salvo é escrito a
partir dos pixels, e não do arquivo original.

Os bytes passam pelo Next, como todo o resto (ADR 0004). A página pede `/fotos/<assinatura>`, o
Next busca na API e repassa. Assim o navegador continua falando com uma origem só, sem CORS e sem
precisar conhecer o endereço da API.

Por enquanto o armazenamento é o disco local, que custa zero. A troca por armazenamento de objetos
fica para a Fase 6, quando houver produção: como a URL é nossa e não do provedor, essa troca mexe
na configuração de armazenamento do Django e, se valer a pena, transforma o repasse do Next num
redirecionamento — nada muda no resto do sistema.

## Consequências

Um link de foto que vaze — num grupo de WhatsApp, no histórico do navegador de uma lan house —
para de funcionar em 15 minutos. O preço é que a assinatura não pode ser guardada nem compartilhada
como endereço permanente; cada carregamento de página gera assinaturas novas.

A assinatura não carrega o tenant. Quem a tem vê aquela foto, e ponto. É por isso que o controle
está em quem recebe assinatura, e é isso que os testes verificam: um usuário de outra assistência
não consegue enviar, esconder nem apagar foto que não é dele, e a foto escondida desaparece do
acompanhamento público.

O arquivo original não é guardado. O que fica como registro é a cópia reduzida, e essa é uma
escolha consciente: 1600px mostram uma trinca com folga, o armazenamento fica menor e os metadados
não ficam guardados esperando para vazar. Quem precisar do arquivo intocado para uma perícia não
vai encontrá-lo aqui.

Apagar uma foto remove o arquivo do disco num sinal de `post_delete`. Se a transação da requisição
for desfeita depois disso, a linha volta sem o arquivo; o endpoint responde 404 nesse caso, em vez
de estourar.

O painel administrativo do Django não envia fotos, só mostra a prévia, esconde e apaga. Envio pelo
painel passaria por fora da normalização, e aí o compromisso de não guardar metadados deixaria de
valer.

## Alternativas consideradas

Servir o diretório de mídia com nomes de arquivo aleatórios seria muito mais simples. Foi
descartado porque o segredo passa a estar no caminho, que nunca expira: um link vazado vale para
sempre, e qualquer erro de configuração no servidor de arquivos expõe o diretório inteiro.

Fazer o navegador buscar a imagem direto no Django resolveria o custo do repasse, mas contraria a
decisão de manter o Next como única origem (ADR 0004) e obrigaria a expor o endereço da API ao
navegador, com CORS para imagens.

Redimensionar no Celery era tentador, já que o worker existe desde a Fase 0. A foto que o técnico
acabou de enviar precisa aparecer na hora, e reduzir uma imagem custa uma fração de segundo, então
o trabalho síncrono é mais simples e tem melhor resultado. Se o volume de envios crescer, essa é
uma das primeiras coisas a mover para a fila.

Aceitar HEIC, o formato padrão do iPhone, ficou de fora: exige `libheif` na imagem do backend, e na
prática o iOS converte para JPEG quando a foto é escolhida por um campo de arquivo. Se uma
assistência real esbarrar nisso, o arquivo é recusado com uma mensagem clara, e aí vale pagar o
custo da dependência.

## Atualização: o Next recusava foto acima de 1 MB

A foto chega à API por uma ação de servidor do Next, e o Next limita o corpo dessas ações a 1 MB
quando nada é configurado. Foto tirada pela câmera do celular costuma ter de 2 a 6 MB, então o
envio falhava antes de chegar à API: a ação estourava e a tela da ordem era trocada por uma tela de
erro. O defeito ficou escondido porque as fotos de exemplo nascem no `make semear`, sem passar pela
tela.

Havia um segundo limite no mesmo caminho. Como o `proxy.ts` roda em todas as rotas, o Next guarda
uma cópia do corpo de cada requisição para ele, e essa cópia para em 10 MB: o que passa disso é
cortado, com apenas um aviso no log, e a ação recebe o formulário pela metade. Uma foto de
exatamente 10 MB, que a API aceita, quebrava por isso.

Os dois limites agora saem de `src/lib/fotos.ts`: o tamanho máximo da foto, 10 MB, que é o mesmo
da API, mais 1 MB de folga para o resto do formulário. O navegador recusa a foto maior que 10 MB
antes de enviar, com a mesma mensagem que a API daria, porque um corpo acima do limite do Next
derruba a tela em vez de voltar como um erro que dê para mostrar. O valor de 10 MB existe no Django e
no Next, e os dois precisam mudar juntos.
