# Pendências da correção dos formulários

Arquivo temporário, de 20 de outubro de 2026. Trata da correção dos seletores e dos formulários que
voltavam ao valor de antes depois de salvar ou de uma recusa da API, registrada como atualização da
ADR 0035.

## Falta conferir

- **Rodar de novo o teste de navegador novo, nos dois tamanhos de tela**, com os serviços no ar
  (`make up`):

  ```bash
  cd apps/web
  npx playwright test e2e/formularios.spec.ts
  ```

  A suíte inteira passou, 20 de 20, no computador e no celular. Três ajustes de forma entraram
  enquanto ela rodava:
  - em `fotosDaOrdem.tsx`, os valores padrão do momento e da legenda quando a foto passa de 10 MB;
  - em `acoesDaEtapa.tsx`, a assinatura de `EscolhaDosItensAprovados` quebrada em linhas;
  - em `registroDaEntrega.tsx`, o comentário e o laço que marcam a forma escolhida.

  O lint e a checagem de tipos passaram depois deles, mas a rodada final do teste foi interrompida.
  A CI deste envio roda os testes de navegador sobre as imagens de produção. Se ela passou, este item
  está resolvido.

- **A peça que falta e as anotações do reparo não têm teste.** Os dois formulários passaram a
  devolver o texto quando o envio é recusado, mas nenhuma recusa deles se provoca pela tela. Para
  conferir à mão, pare a API com `docker compose stop api` antes de salvar. O texto deve continuar
  no campo, abaixo da mensagem "Não foi possível falar com o servidor.". Depois, rode
  `docker compose start api`. A peça que falta aparece em "Aguardar uma peça", com a ordem em reparo.

## Notado e não corrigido

- A aprovação sem nenhum item marcado é recusada com "Marque ao menos um item. Se o cliente recusou
  tudo, use Reprovado.", mas o botão na tela se chama "O cliente recusou". O texto está em
  `apps/api/bancada/ordens/serializers.py`.
- Quando outra pessoa já mudou a etapa da ordem, quem tenta a mesma mudança vê a mensagem técnica da
  API. Na entrega feita por duas pessoas ao mesmo tempo, aparece: "Não é possível ir de 'entregue'
  para 'entregue'. A partir de 'entregue' só: nenhum."

## Nesta máquina

- O `.env` ganhou `THROTTLE_CADASTRO=100/hour`, para rodar os testes de navegador mais de uma vez
  por hora, como o README explica. O `.env` não vai para o GitHub.
- `apps/web/node_modules` e `apps/web/.next` pertencem ao root, porque o Docker criou essas pastas
  para os volumes do container `web`. Por isso o `npm ci` em `apps/web` falha por falta de
  permissão. Os testes desta correção rodaram numa cópia de `apps/web` fora do repositório. Para
  rodar no próprio repositório, devolva as pastas ao seu usuário:
  `sudo chown -R $USER apps/web/node_modules apps/web/.next`.

## Próximo passo

A Fase 4P, estoque de peças. Ela começa decidindo o que entra, a partir do que os concorrentes
oferecem (`docs/PLANO.md`).

---

**Quem ler este arquivo: depois de ler, apague-o do repositório.** Se algum item ainda valer, leve-o
para o `docs/PLANO.md` antes de apagar.
