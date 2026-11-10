# Checkout Stripe local — Payments e Tax

Implementação em 08/11/2026. Escopo: desenvolver e testar o checkout local; sem publicar, fazer push ou ativar pagamentos reais.

Atualização: o acompanhamento das compras de teste foi implementado em [orders.md](orders.md). Meus pedidos fica diretamente no header; a confirmação também abre os detalhes da compra. Os registros de teste persistem na Stripe, e os status de produção/entrega podem ser atualizados no painel administrativo. As seções abaixo sobre pedidos duráveis em banco e fulfillment continuam descrevendo os requisitos para uma futura operação de vendas reais.

## Plano aplicado

Imaginne Lab vende peças físicas impressas em 3D, com catálogo em CAD e entrega no Canadá. O fluxo usa a [Checkout Sessions API e o Checkout hospedado](https://docs.stripe.com/checkout/quickstart), recomendados pela skill oficial para pagamentos avulsos. O site mantém a revisão de itens, cores e quantidades; os dados de cartão e endereço são preenchidos na Stripe. Não há assinatura, marketplace ou necessidade de Connect.

O plugin oficial foi instalado e o MCP autenticado. `stripe_implementation_planner` não ficou disponível nas ferramentas desta conversa. Foi executado o fallback solicitado, `npx skills add https://docs.stripe.com`, e foram lidas as referências oficiais de Payments, Tax e segurança. Este documento não é saída do planner.

1. Carrinho e Comprar agora levam a `/checkout/`, `/pt/checkout/` ou `/es/checkout/` usando NavigationLink.
2. A revisão mostra itens, cores, quantidades, subtotal em CAD, frete simulado e informação de impostos. Quantidades podem ser alteradas e itens removidos.
3. A Server Action exige identidade verificada por `getCurrentUser`, valida a entrada com Zod e relê os produtos ativos pelo cliente Supabase da sessão, preservando RLS. Não usa chave de serviço.
4. Preço sob consulta, produto removido, cor inválida e estoque insuficiente bloqueiam o pagamento. O estoque de um produto é comparado à soma de suas cores. Um preço alterado exige nova revisão antes de criar a sessão.
5. O servidor cria a sessão em CAD, com itens e metadados provenientes do catálogo, seleção dinâmica de meios de pagamento e chave de idempotência por tentativa e conteúdo validado. O domínio de redirecionamento é conferido.
6. Cancelamento mantém o carrinho. O retorno consulta a sessão na Stripe e exige a mesma identidade, moeda, origem da integração e modo de teste. Uma URL de sucesso ou uma sessão concluída mas ainda não paga não confirma pagamento.
7. O webhook verifica assinatura sobre o corpo original, limita o tamanho do evento e rejeita eventos reais. Reconhece conclusão, sucesso/falha de pagamento assíncrono e expiração. Nesta etapa de teste, não despacha produtos, não grava pedidos e não altera estoque; repetições não têm efeitos colaterais.

## Configuração local

Use `.env.example` como referência para o ambiente local, preferindo credenciais de um **sandbox separado**. O arquivo versionado contém somente nomes e valores de exemplo, sem credenciais.

Correção da configuração em 08/11/2026: o código estava pronto, mas faltavam as variáveis locais; por isso a revisão mostrava a mensagem de pagamento não configurado e bloqueava o botão. Foi criado `.env.local`, ignorado pelo Git, com a chave de teste fornecida pelo usuário, checkout habilitado e retorno para `http://localhost:3000`. Tax permanece desabilitado. A API confirmou que a chave opera em modo de teste; não foi confirmado se pertence a um sandbox separado ou ao modo de teste compartilhado. Como a chave foi compartilhada no chat, recomenda-se rotacioná-la e atualizar somente o ambiente local.

A verificação HTTP do Next em execução retornou 200 com `configured=true`. Uma sessão Checkout de teste foi criada pela API com a configuração da integração e imediatamente expirada, sem inserir cartão nem realizar pagamento. A URL retornada pertencia a `checkout.stripe.com` e a sessão tinha `livemode=false`. O controle do navegador do usuário estava indisponível; não foi executada uma compra na sessão autenticada do navegador.

- `STRIPE_CHECKOUT_ENABLED=true` habilita o fluxo apenas localmente.
- `CHECKOUT_SITE_URL=http://localhost:3000` precisa corresponder ao endereço e à porta do Next local.
- `STRIPE_SECRET_KEY`: chave de sandbox `rk_test_…` preferencialmente, ou `sk_test_…`. O fluxo hospedado não precisa de chave publicável no navegador.
- `STRIPE_TEST_SHIPPING_CENTS`: frete **simulado** em centavos de CAD; padrão zero. Não é uma política de frete comercial.
- `STRIPE_WEBHOOK_SECRET`: segredo retornado pelo encaminhamento local da Stripe CLI. Para recebê-lo, use `stripe listen --forward-to localhost:3000/api/stripe/webhook/` e configure o segredo somente no ambiente local.
- `STRIPE_TAX_ENABLED`: desabilitado por padrão. Habilitar exige configurações de Tax ativas e um registro canadense ativo no mesmo sandbox; a aplicação verifica esses pré-requisitos antes de criar a sessão. Não cria registros tributários nem altera configurações da conta.

Permissões da chave restrita: escrita/leitura de Checkout Sessions e permissões dependentes exigidas pela Stripe para criar os itens e o PaymentIntent da sessão. Com Tax habilitado, também leitura de Tax Settings e Tax Registrations. Ajustar essas permissões no sandbox conforme os erros de autorização, sem conceder acesso irrestrito por padrão.

Execute `npm run dev` e abra `/pt/checkout/` depois de adicionar uma peça ao carrinho. Use uma conta autenticada no site. Cadastros e autenticação dependem do ambiente Supabase configurado; não criar contas de teste no backend de produção.

O código recusa chaves `*_live_*` e origens sem https (exceto localhost). Desde 09/11/2026 o checkout de teste também roda no site publicado: na Vercel, configure `STRIPE_CHECKOUT_ENABLED=true`, `STRIPE_SECRET_KEY` de teste e `CHECKOUT_SITE_URL` com o domínio https de produção. Para o webhook em produção, crie o endpoint `https://<domínio>/api/stripe/webhook/` no painel da Stripe (modo teste) e coloque o segredo em `STRIPE_WEBHOOK_SECRET`. As variáveis locais também ficam na Vercel (ambiente Development, com `CHECKOUT_SITE_URL=http://localhost:3000`): para montar o `.env.local`, rode `vercel env pull`. As travas de concorrência de pedidos continuam por processo (ver orders.md).

## Stripe Tax

O suporte a `automatic_tax` está implementado, mas não foi validado em uma conta Stripe real. As configurações, registros e cálculos usados nos testes são sintéticos. O imposto de 13% do simulador serve exclusivamente à verificação do fluxo e **não determina a tributação de qualquer endereço ou produto**.

Antes de testar Tax no sandbox da empresa, confirmar origem, registros e classificação fiscal dos objetos de cozinha, decoração e demais peças. O código preserva o código fiscal padrão configurado na conta, sem inventar códigos por produto. A existência de um registro canadense não demonstra cobertura de todas as províncias. Verificar uma [Tax Calculation](https://docs.stripe.com/tax/testing) com endereço e classificação confirmados, incluindo `taxability_reason`. A coleta de imposto não equivale ao envio de declarações ou recolhimento à autoridade tributária.

## Cobertura e limites

- Testes unitários cobrem entradas adulteradas, identidade, preço alterado, estoque agregado, cores, limites de valores, idempotência, bloqueio de chaves reais/origens públicas, configuração tributária, propriedade da sessão e assinatura/eventos assíncronos do webhook.
- A suíte `tests-store` usa somente backend HTTP e Stripe simulados em loopback. Exercita compra pelo carrinho e Comprar agora, revisão, pagamento, cancelamento, confirmação pendente, login obrigatório, estoque, três idiomas e layout móvel/desktop em tema escuro. Não acessa Stripe ou Supabase reais.
- `npm run typecheck`: passou. `npm test`: **97 testes em 19 arquivos passaram**.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e:store -- --max-failures=1 --reporter=line`: **25 testes passaram**, incluindo os seis novos cenários de checkout. No PowerShell, definir antes `$env:PLAYWRIGHT_CHANNEL='chrome'`. A primeira tentativa não tinha Chromium instalado; Chrome está instalado e foi usado na execução concluída. Foi necessária execução fora da restrição de processos para finalizar o teardown no Windows.
- Build local com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9` e chave publicável sintética: passou; rotas de checkout e webhook geradas como dinâmicas. Nenhum deploy foi executado.
- Lint sem erros; 11 avisos nos arquivos preexistentes. `git diff --check` passou.
- Layout inspecionado nas capturas `test-results/store-checkout-desktop.png` e `test-results/store-checkout-mobile.png`. Artefatos de teste permanecem ignorados pelo Git.
- A instalação do SDK relatou oito vulnerabilidades moderadas no conjunto de dependências. Não foi executado `npm audit fix` nem uma auditoria completa; nenhum pacote fora do escopo foi atualizado no lockfile.
- As referências pessoais obrigatórias de React/segurança e o Dev Brain nos caminhos `C:/Users/gabri/…` não existem neste computador. `docs/maestri/Guia.md` também não está disponível. Foram utilizadas a documentação local do Next 16 e as referências oficiais da Stripe; o Dev Brain não foi atualizado.
- A verificação adicional de configuração consultou a API Stripe em modo de teste e criou/expirou uma sessão sem pagamento. Não houve cálculos fiscais reais, pagamento, alteração do banco da empresa, configuração de registros tributários, publicação, push ou merge.

Esta entrega é um checkout de teste. Antes de uma futura etapa de vendas reais, é obrigatório implementar pedidos duráveis, reserva/baixa de estoque e processamento transacional e idempotente de fulfillment no webhook. Também será necessário definir frete comercial e aplicar a classificação fiscal por produto. O retorno do navegador não deve executar fulfillment. Nada disso foi ativado nesta etapa.
