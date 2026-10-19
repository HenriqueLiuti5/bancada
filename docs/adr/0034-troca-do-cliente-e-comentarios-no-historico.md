# 0034 — Troca do cliente da ordem e comentários no histórico

## Contexto

A ADR 0027 deixou um caso sem saída: a ordem aberta no cliente errado. Se o atendente escolheu
"Maria Silva" na busca quando o certo era "Maria Souza", corrigir nome e telefone transforma a Maria
Silva, com todas as ordens dela, na Maria Souza. A única proteção era o aviso abaixo do título da
tela Cliente e aparelho. Trocar o cliente ficou para depois, por ser outra operação: mudar a quem a
ordem pertence, com reflexo nos avisos, no link e no histórico.

A ADR 0031 deixou para depois os comentários no histórico, como no ticket do Milvus, porque
escrever no histórico sem mudar de etapa exige um registro novo na API, com isolamento por
assistência. Até aqui, o diagnóstico e o laudo cumpriam esse papel.

## Decisão

**Registros no histórico.** Uma tabela nova, `RegistroOS`, guarda o que entra no histórico sem ser
mudança de etapa: os comentários da equipe e a troca de cliente. Ela fica separada do `EventoOS`
porque os eventos de etapa alimentam a página do cliente, a linha do tempo do recibo, o tempo por
etapa do painel e os avisos por e-mail. Um comentário ali apareceria para o cliente como etapa
repetida e entraria nas contas do painel. Como fotos e pagamentos, o registro leva a assistência e
fica sob o RLS (ADR 0009). A API não edita nem apaga registros, como já acontecia com as mudanças de
etapa.

**Comentários.** No alto da aba Histórico ficam o campo "Escreva um comentário para a equipe. O
cliente não vê." e o botão Comentar. Qualquer papel comenta, em qualquer etapa, inclusive depois da
entrega, quando o cliente volta pela garantia, e a ordem continua na mesma etapa. O comentário tem
até 2.000 caracteres, e um comentário vazio é recusado. Ele aparece no histórico como as outras
linhas, com as iniciais de quem escreveu, "comentou" e a hora. Não vai para a página do cliente, para
os PDFs nem para os e-mails, e não dispara aviso.

**Onde se troca o cliente.** Para ordens abertas, a tela Cliente e aparelho, aberta pelo Editar da
ficha, mostra no alto o aviso "A ordem foi aberta no cliente errado?", com o botão "Trocar o
cliente". Ele leva a `/ordens/<id>/cliente/trocar`. A tela mostra com quem a ordem está hoje. O
cliente certo é encontrado pela mesma busca da abertura, que ali não lista o cliente atual, ou
cadastrado na hora, com os campos e as regras da abertura.

**Quem e quando.** Qualquer papel troca o cliente, como na correção (ADR 0027), porque quem erra no
balcão costuma ser o atendente. A troca vale só para ordens abertas: depois da entrega, o recibo já
saiu e os pagamentos foram registrados com aquele cliente, e a API responde 409. No modo só de
consulta (ADR 0022), a troca e o comentário são recusados, como as outras escritas.

**O aparelho.** Todo aparelho pertence a um cliente, e a correção não deixa um aparelho mudar de
dono (ADR 0027). Na troca:

- se o aparelho só tem esta ordem, ele foi cadastrado com ela, no cliente errado, e vai junto para o
  cliente certo, com o IMEI e a senha de desbloqueio. Se os dados dele também estiverem errados,
  agora a tela Cliente e aparelho os corrige sem mexer em ninguém;
- se ele tem outras ordens, ele é do cliente errado e continua com ele. A tela pergunta qual é o
  aparelho do cliente certo: um que ele já tenha ou um novo, com os campos da abertura, inclusive a
  senha.

A API segue a mesma regra. Ela recusa outro aparelho quando o atual vai junto e exige a escolha
quando ele fica. Assim, a ordem nunca aponta para um cliente e um aparelho de pessoas diferentes.

**O link.** A troca gera um link de acompanhamento novo, e o antigo passa a mostrar "Link não
encontrado". O link antigo pode ter chegado à pessoa errada, pelo e-mail da abertura, que vai para o
endereço do cliente, ou pelo botão do WhatsApp, que usa o telefone dele, e mostrava o aparelho, as
fotos e o orçamento de outra pessoa. O cache do link antigo (ADR 0008) é apagado assim que a troca é
gravada. Antes de confirmar, a tela avisa: mande o link novo pelo WhatsApp e reimprima o
comprovante, que passa a sair com o cliente certo. Os avisos das próximas etapas já vão para o
e-mail do cliente certo.

**Histórico e auditoria.** A troca entra no histórico como "trocou o cliente", com "De Maria Silva
para Maria Souza." e, quando o aparelho mudou, "Aparelho trocado de Apple iPhone 11 para Samsung
Galaxy A54.", com os nomes de como estavam na hora. Na auditoria (ADR 0013), a ação nova
`cliente_trocado` registra quem trocou, quando, de onde, o número da ordem e os dois clientes com os
seus números de cadastro, porque os nomes podem ser corrigidos depois. O cliente errado não é
apagado: ele continua com as outras ordens dele, ou sem nenhuma, e a troca se desfaz trocando de
novo.

Os textos do tour da tela da ordem passaram a citar os comentários, na parada das abas, e a troca do
cliente, na parada da ficha.

## Consequências

O histórico continua mostrando para onde cada aviso foi de fato (ADR 0027). Depois da troca, a linha
da abertura ainda diz "Cliente avisado em" com o e-mail do cliente errado, e é isso que explica o
link novo.

Um cliente cadastrado por engano fica sem ordens e continua aparecendo na busca, porque não há tela
para apagar clientes.

Se o cliente certo já tinha o mesmo aparelho cadastrado e o aparelho da ordem vai junto, ele fica com
dois cadastros do mesmo aparelho, e os dois aparecem na abertura da próxima ordem.

Quem já tinha o link certo também precisa do novo. No balcão, isso quase não acontece: o comprovante
impresso na abertura saiu com o nome do cliente errado e precisa ser reimpresso de qualquer jeito.

A leitura do cliente e do aparelho escolhidos na abertura foi para `ordens/nova/clienteEAparelho.ts`,
usado pela abertura e pela troca. O teste de navegador ganhou o caminho da troca: abre uma ordem para
uma cliente, abre outra escolhendo-a por engano, comenta, troca pela cliente certa com aparelho
novo e confere que o link antigo não abre mais. Agora cada execução completa cria quatro assistências,
duas por tamanho de tela, então mais de duas execuções na mesma hora contra o mesmo ambiente
esbarram no limite de cadastros (ADR 0033).

## Alternativas consideradas

**Comentário como evento de etapa, sem mudar o status.** Apareceria na página do cliente e no recibo
como etapa repetida, entraria no tempo por etapa do painel e passaria pelo sinal dos avisos, que trata
cada evento como mudança de etapa.

**Editar e apagar comentários.** Um comentário errado se corrige com outro, como num chamado. Sem
edição, o histórico continua confiável como prova do que foi combinado, igual às mudanças de etapa.

**Mostrar a troca a partir da auditoria.** A auditoria é para quem administra a plataforma, guarda o
detalhe em 200 caracteres e não é lida pelas telas da assistência. Cada tabela fica com o seu uso.

**Manter o link antigo.** Seria mais simples para quem já tinha o link certo, mas a pessoa errada
continuaria acompanhando o conserto de outra.

**Mandar o link novo por e-mail na hora da troca.** Os avisos nascem das mudanças de etapa, um por
evento (ADR 0011), e um aviso sem etapa pediria outro modelo. O WhatsApp da ficha já manda o link na
hora, e o e-mail da etapa seguinte leva o novo.

**Apagar o cliente que ficou sem ordens.** Deixaria a busca limpa, mas uma troca desfeita perderia os
dados de um cliente que estava certo, e apagar cliente é só para dono e técnico (ADR 0016).

**Deixar escolher outro aparelho mesmo quando o atual vai junto.** Evitaria o cadastro duplicado, mas
o aparelho da ordem ficaria sem nenhuma ordem, com a senha de desbloqueio guardada para sempre: a
purga só alcança aparelhos com ordem encerrada (ADR 0013).

**Trocar também depois da entrega.** O recibo entregue e os pagamentos são do cliente que estava na
ordem. Se o erro só aparecer depois, o comentário registra o que aconteceu.
