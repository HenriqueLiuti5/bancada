# 0006 — Asaas para cobrança recorrente

## Contexto

O produto é vendido por assinatura mensal a assistências técnicas brasileiras, em geral
pequenas. A forma de pagamento precisa ser a que esse público efetivamente usa.

## Decisão

Asaas como provedor de cobrança, atrás de uma interface própria no código que isola o restante
do sistema dos detalhes do provedor.

## Consequências

PIX e boleto recorrentes são nativos, que é como esse público paga. Stripe tem documentação e
experiência de integração melhores, mas cobrança recorrente por PIX no Brasil é limitada, e
exigir cartão de crédito reduziria a conversão no segmento pretendido.

Três cuidados entram no desenho desde o começo, porque são onde integrações de cobrança
costumam falhar. O webhook precisa ser idempotente, já que o provedor reenvia eventos: cada
evento processado é registrado por identificador e o reenvio é ignorado. A assinatura do
webhook é verificada antes de qualquer processamento. E o estado da assinatura é uma máquina
explícita: `trial → ativa → inadimplente → suspensa → cancelada`.

Tenant inadimplente entra em período de tolerância com aviso na interface, depois passa a
somente leitura. Os dados são preservados: assistência técnica atrasa pagamento e volta.

## Alternativas consideradas

Stripe foi descartado pela limitação de PIX recorrente no Brasil. A interface própria mantém a
troca de provedor viável, caso essa avaliação mude.
