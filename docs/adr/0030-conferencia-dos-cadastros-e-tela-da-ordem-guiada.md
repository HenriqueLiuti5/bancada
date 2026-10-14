# 0030 — Conferência dos cadastros e tela da ordem guiada

## Contexto

Depois de usar o sistema, o Henrique mandou uma lista de pedidos. Os que mudam o produto:

- conferir as informações na abertura da ordem e no cadastro do cliente, para não salvar um número
  errado, como um telefone de 5 dígitos;
- mostrar de algum jeito tudo o que é obrigatório;
- deixar a tela da ordem mais simples para quem trabalha nela, porque não fica claro o que fazer em
  cada etapa e aparece muita coisa ao mesmo tempo;
- um botão para o WhatsApp dele em caso de dúvida, inclusive no menu Ajuda, como "Entrar em contato
  com suporte";
- tirar uma pergunta do FAQ da página inicial e explicar duas outras para quem não é técnico.

Até aqui, o telefone só precisava ter 10 ou 11 dígitos com um DDD entre 11 e 99. Passavam DDDs que
não existem, como 23, e celulares antigos de 8 dígitos, gravados como se fossem fixos. O erro era
sempre "Informe o telefone com DDD.", sem dizer o que estava errado. O CPF do cliente não era
conferido. Nada marcava os campos obrigatórios. A tela da ordem empilhava cerca de dez cartões, e os
botões de status tinham o nome da etapa de destino, como "Orçamento enviado", em vez da ação.

## Decisão

**Telefone conferido.** A API (`core/telefones.py`) e o site (`lib/telefone.ts`) seguem a mesma
regra. Depois de tirar o +55 e o 0 de longa distância, o número precisa ter 10 ou 11 dígitos e um
dos 67 DDDs do Brasil. Celular tem 11 dígitos e começa com 9; fixo tem 10 e começa com 2, 3, 4 ou 5.
Com 10 dígitos começando de 6 a 9, é um celular antigo sem o 9, e a mensagem diz que falta um
dígito. Cada mensagem explica o erro, por exemplo "O número está incompleto: tem 5 dígitos. Com o
DDD, celular tem 11 dígitos e fixo tem 10." O campo mostra o erro quando a pessoa sai dele e, quando
o número está certo, formata e mostra "Confira: (43) 99615-6781, celular com DDD 43 (PR)", para quem
atende ler de volta ao cliente. A regra vale para o telefone do cliente, na abertura e na correção,
para o WhatsApp do cadastro e da assistência e para o telefone da loja.

**CPF ou CNPJ do cliente.** Continua opcional, mas, quando preenchido, os dígitos verificadores são
conferidos com a mesma regra da assinatura, que já aceita o CNPJ com letras. O campo passou a se
chamar "CPF ou CNPJ", e o comprovante mostra o número formatado, como o CNPJ da assistência.

**Obrigatórios.** Um asterisco vermelho depois do rótulo, e a frase "Os campos com * são
obrigatórios." no alto de cada formulário. Os opcionais continuam com a dica "Opcional.". As listas
de escolha que já vêm preenchidas, como Loja e Papel, também levam o asterisco, para a frase não dar
a entender que são opcionais. Nos formulários de uma linha só (item do orçamento, pagamento, período
do painel, custos da plataforma e nova senha de alguém da equipe), o asterisco vai no rótulo pequeno
ou no texto de exemplo. O login passou a ter `required` nos dois campos.

**Tela da ordem guiada.** No alto, o cartão "Próximo passo" junta a barra de etapas, o que fazer
agora em palavras simples ("Montar o orçamento", "Esperar a resposta do cliente", "Entregar ao
cliente"), uma explicação curta e os botões. Os botões têm o nome da ação ("Começar o diagnóstico",
"Enviar o orçamento ao cliente", "O cliente aprovou", "A peça chegou: voltar ao reparo"), e a ação
principal da etapa é a verde. Em Recebido, o cartão lista as tarefas do balcão: tirar as fotos,
imprimir o comprovante e mandar o link. No diagnóstico, o orçamento é montado dentro do cartão, e
"Enviar o orçamento ao cliente" fica desativado até ter um item. Quando o cliente precisa saber de
algo (o link, o orçamento, o aparelho pronto), um botão abre o WhatsApp no número dele com a mensagem
pronta; para isso, o detalhe da ordem na API passou a trazer `cliente_telefone`. Fotos, anotações do
reparo e histórico viraram seções que abrem e fecham, e as fotos já vêm abertas em Recebido. A
observação fica atrás de "+ Escrever uma observação". Ordem encerrada mostra "Situação" no lugar de
"Próximo passo". O tour da tela começa pelo cartão novo e ganhou uma parada nas anotações.

**Suporte no WhatsApp.** O número continua vindo de `WHATSAPP_DO_SUPORTE` (ADR 0020), preenchida no
`.env` de cada ambiente e nunca no `.env.example`, porque o repositório é público. Ele aparece num
botão fixo da página inicial ("Dúvidas? Fale no WhatsApp"), no rodapé das telas de entrar, cadastrar
e recuperar a senha ("Precisa de ajuda? Fale com o suporte no WhatsApp") e no menu Ajuda, com o nome
"Entrar em contato com suporte".

**Textos.** Saiu do FAQ a pergunta "Já uso papel, planilha ou outro sistema. Como começo?". As
respostas sobre segurança e pagamento foram reescritas em frases curtas, um assunto por parágrafo,
sem termos como "trava no banco de dados". O Asaas é apresentado como a empresa que cuida da
cobrança do Bancada, comparado à maquininha do balcão, ali e na tela Assinatura. A tela Equipe
explica melhor o que cada papel pode fazer.

## Consequências

Os telefones gravados antes desta fase não foram mexidos. Um número com DDD inexistente ou um
celular sem o 9 só é barrado quando alguém corrige o cliente, e aí o campo pede o número certo.

O cartão Orçamento sai de cena durante o diagnóstico, porque o orçamento é montado no "Próximo
passo", e volta logo abaixo dele nas etapas seguintes.

Em produção, `WHATSAPP_DO_SUPORTE` precisa estar configurada no servidor. Sem ela, os botões de
suporte não aparecem.

## Alternativas consideradas

**Máscara que formata enquanto a pessoa digita.** Máscaras atrapalham quem cola o número ou corrige
um dígito no meio. O campo formata quando a pessoa sai dele, e a linha "Confira" faz a conferência.

**Consultar se o número tem WhatsApp.** Exigiria um serviço pago e mandar o número do cliente para
fora do Bancada. A regra do DDD e do formato já pega os erros de digitação relatados.

**Uma tela por etapa, escondendo o resto.** O dono que quer ver as fotos ou o histórico teria de
procurar onde eles foram parar. Com as seções recolhidas, tudo continua a um clique.

**Marcar só os opcionais.** A dica "Opcional." já existia e não bastou: o pedido foi mostrar o que é
obrigatório. O asterisco é o sinal que as pessoas já conhecem de outros formulários.
