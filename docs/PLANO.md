# Plano do projeto

## Problema

Assistências técnicas de celular controlam ordens de serviço em caderno, planilha ou grupo de
WhatsApp. O resultado é previsível: o cliente liga toda hora para perguntar do aparelho, o
técnico perde tempo respondendo, e quando há divergência sobre prazo, preço ou estado do
aparelho na entrada, não existe registro para resolver a discussão.

## Produto

O Bancada é um sistema onde a assistência registra cliente, aparelho e defeito, e acompanha a
ordem de serviço por uma sequência de estados até a entrega. Cada ordem gera um link público e
não adivinhável que a assistência manda ao cliente. O cliente abre o link sem criar conta e vê
a linha do tempo do reparo, o orçamento e as fotos do aparelho na entrada.

É um SaaS B2B com assinatura self-service: a assistência se cadastra sozinha e paga mensalidade.

## Domínio

```
Tenant (assistência)  ──< Loja ──< Usuário (dono | técnico | atendente)
Cliente (da assistência)  ──< Aparelho (marca, modelo, IMEI, senha, cor)

OrdemServico
  número, tenant, loja, cliente, aparelho, técnico responsável,
  status, problema relatado, diagnóstico, laudo,
  checklist de entrada, fotos, garantia, datas, token público
    ──< ItemOrcamento (peça ou serviço, valor, aprovado)
    ──< EventoOS (histórico imutável: quem, quando, de qual status para qual)
```

### Estados de uma ordem de serviço

```
RECEBIDO → EM_DIAGNOSTICO → ORCAMENTO_ENVIADO ─┬→ APROVADO → EM_REPARO ─┬→ PRONTO → ENTREGUE
                                               │                        └→ AGUARDANDO_PECA ↺
                                               └→ REPROVADO → DEVOLVIDO_SEM_REPARO
```

Transições são validadas explicitamente. Cada uma grava um `EventoOS`, que nunca é editado nem
apagado. Esse histórico é a trilha de auditoria do produto e será a base de dados da camada de
inteligência artificial na Fase 4.

## Dados sensíveis

O sistema armazena CPF, telefone, IMEI e, inevitavelmente, a senha ou o padrão de desbloqueio
do aparelho. Três regras decorrem disso e valem desde a primeira linha de código:

1. A senha de desbloqueio é criptografada em nível de campo, acessível apenas a usuários com
   papel técnico do próprio tenant, com acesso registrado em auditoria, e purgada automaticamente
   após a entrega do aparelho.
2. A página pública expõe o mínimo: status, linha do tempo, orçamento e fotos. Nunca IMEI
   completo, CPF ou endereço.
3. Fotos ficam em bucket privado, servidas por URL assinada com validade curta.

Na relação de LGPD, a assistência é a controladora dos dados dos clientes finais e o Bancada é
o operador.

## Roadmap

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Ambiente de desenvolvimento, CI, decisões registradas | concluída |
| 1A | Modelo de dados, máquina de estados e painel administrativo | concluída |
| 1B | API e telas em React: login, lista de OS, abertura e mudança de status | concluída |
| 1C | Página pública de acompanhamento | concluída |
| 1D | Fotos do aparelho e trava no banco (RLS) | concluída |
| 2A | Aviso ao cliente por e-mail, em tarefa assíncrona | concluída |
| 2B | PDF da ordem de serviço | concluída |
| 2C | Auditoria de acesso a dado sensível e purga automática da senha | |
| 3 | Painel, busca, filtros, papéis e permissões | |
| 4 | Inteligência artificial: tradutor técnico, triagem assistida, busca no histórico | |
| 5 | Cobrança recorrente, planos, limites de uso | |
| 6 | Publicação, entrega contínua, monitoramento, backup | |
| 7 | WhatsApp, relatórios, estoque de peças | |

A Fase 1 termina quando uma assistência real conseguir abrir uma ordem de serviço e enviar o
link ao cliente. Nada que não sirva a essa frase entra antes.
