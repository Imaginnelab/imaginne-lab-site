# Meus pedidos e acompanhamento

Implementado localmente em 08/11/2026. Após uma compra de teste, o cliente pode abrir **Meus pedidos diretamente no header**. No celular, o mesmo acesso aparece como ícone ao lado do carrinho. O menu da conta não é necessário para navegar até o histórico.

## Comportamento

- Histórico: `/orders/`, `/pt/orders/`, `/es/orders/`. Detalhes: a mesma rota seguida pelo ID do pedido.
- A confirmação do checkout tem links para o pedido e para o histórico. Compras de teste anteriores desta integração aparecem sem precisar comprar novamente.
- Cada cartão mostra data, número, total em CAD, descrição inicial e status. O detalhe inclui os itens e preços da compra, endereço informado no Checkout, impostos, frete e linha de acompanhamento.
- Etapas: aguardando pagamento, pagamento confirmado, em produção, preparando envio, enviado e entregue. Cancelamento é um estado separado. Conclusão de uma sessão sem confirmação do pagamento continua aparecendo como pendente.
- A loja pode informar previsão de entrega e código de rastreio da Canada Post. O rastreio abre no site da transportadora; não depende de conta da API para o cliente consultar um código já existente.
- Para gerenciar, abrir **Pedidos no header do painel administrativo**: `/admin/orders/` ou seu equivalente localizado. Cada pedido tem um formulário para atualizar a etapa, previsão e rastreio.
- A lista administrativa permite combinar **status**, **data inicial de criação** e **data final de criação**, com Aplicar filtros e Limpar filtros. Ambos os dias são inclusivos, no mesmo fuso `America/Sao_Paulo` usado para apresentar as datas. Datas isoladas também funcionam. Intervalos invertidos, datas inválidas e status desconhecidos exibem uma mensagem de validação.
- Os filtros ficam na URL e são preservados em Pedidos anteriores/Pedidos mais recentes. Aplicar outra seleção reinicia a paginação. Os cursores administrativos também ficam vinculados aos filtros; um cursor de outra seleção não é reutilizado. A busca usa o intervalo `created` da Stripe e confere o status do pedido no servidor, sem confundir o status da sessão Checkout com o andamento da produção.
- Status de produção e entrega são atualizados manualmente pelo administrador. A aplicação não inventa previsão, não simula eventos da transportadora, não compra etiquetas, não faz envio e não emite reembolsos.

## Persistência e autorização

Esta etapa usa as Checkout Sessions já persistidas na Stripe como registros das compras de teste. As alterações de acompanhamento ficam em metadados da própria sessão. Não foi criada uma tabela de pedidos no Supabase nem um armazenamento em localStorage para o histórico. A área não depende de novas migrações ou da conta Canada Post pendente.

- Leituras do cliente exigem `getCurrentUser` e comparam `client_reference_id` ao ID verificado. Email e conhecimento do ID/link não autorizam acesso. O histórico não depende do email continuar igual ao da compra.
- Leituras e escritas administrativas conferem `getAdmin` novamente no servidor. Toda alteração passa pela Server Action, com Zod, conferência de origem da integração, modo de teste, moeda, pagamento e revisão.
- As sessões aceitas são somente desta integração, em CAD, com `livemode=false` e Checkout concluído. Sessões abertas/abandonadas não são apresentadas como compras.
- As consultas permanecem no servidor e enviam DTOs específicos à interface. Endereço e itens de outra pessoa não são retornados. Uma tentativa de abrir um pedido de outro cliente recebe 404.
- Nomes, quantidades e valores vêm do registro da compra na Stripe, não do catálogo atual. Remover ou alterar um produto não apaga o registro anterior. Novas sessões também armazenam uma prévia para reduzir leituras na listagem.
- A listagem traz até 20 pedidos por página. Para limitar o trabalho, cada solicitação examina no máximo 500 sessões. Se houver mais registros a examinar, a interface oferece continuação; não afirma que o histórico está vazio. O cursor é cifrado e autenticado com AES-GCM, vinculado ao usuário e ao contexto administrativo/cliente, para não expor IDs de outras pessoas durante a busca.
- O servidor local serializa as alterações de um mesmo pedido e compara revisões para impedir sobrescrita por outra aba. Essa trava é por processo: antes de uso em múltiplas instâncias, a persistência de acompanhamento e o controle de concorrência devem passar para um armazenamento transacional compartilhado.
- Não são usadas chaves de serviço do Supabase, e suas políticas RLS não foram modificadas. O Supabase continua fornecendo a identidade e o papel de administrador; os dados de pedidos desta etapa residem na Stripe e são autorizados no servidor.
- Os limites locais/de teste de `checkoutSettings` permanecem aplicáveis. Reembolsos, devoluções e cancelamentos financeiros não são sincronizados nesta etapa. O webhook existente continua validando eventos de teste, sem baixa de estoque ou fulfillment.

## Validação

- Testes de lógica cobrem autenticação, separação entre clientes, autorização administrativa, estados de pagamento, transições, snapshots, dados de rastreio, revisões concorrentes, paginação, mudança de email e adulteração dos cursores.
- A suíte de navegador usa somente Stripe e Supabase simulados em loopback e contas sintéticas. Cobre acesso pelo header, compra → detalhes, histórico, bloqueio entre clientes, redirecionamento de não administradores, atualização administrativa refletida para o comprador, pagamento pendente, três idiomas e layout móvel/desktop.
- A suíte completa de navegador passou com 31 cenários. Após o reforço da paginação, os seis cenários de pedidos foram repetidos e passaram. Evidências visuais: `test-results/orders-desktop.png` e `test-results/order-details-mobile.png`, inspecionadas visualmente e ignoradas pelo Git.
- Após adicionar os filtros, passaram os **nove cenários atuais de pedidos** no Chrome com serviços simulados. Os novos cenários verificam status + datas combinados, limites de meia-noite, inclusão do último dia, limpeza, paginação de 22 resultados, troca de filtros e intervalo inválido. A captura `test-results/admin-order-filters-mobile.png` foi inspecionada visualmente.
- Validação atual: `npm test` com **125 testes em 24 arquivos**, TypeScript e build local com Supabase isolado passaram. Lint dos arquivos afetados pelos filtros sem erros ou avisos; o lint completo anterior tinha 11 avisos em arquivos preexistentes. `git diff --check` passou.
- Verificação somente por leitura na conta Stripe em modo de teste encontrou três sessões concluídas desta integração, com vínculo ao usuário, itens e endereço disponíveis. Não foram alteradas as compras existentes nem seus status reais durante essa verificação.

As referências pessoais/Dev Brain nos caminhos `C:/Users/gabri/…` e `docs/maestri/Guia.md` não estão disponíveis neste computador. Não houve publicação, push ou merge. A integração Canada Post iniciada antes da mudança de prioridade continua sem credenciais/origem e não foi conectada à tela nesta entrega.
