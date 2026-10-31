# Auditoria de segurança e performance — loja Imaginne Lab

- **Data:** 2026-10-07 · **Alvo:** `main` em `6be3f7b` (produção, `https://imaginne-lab-site.vercel.app`), projeto Supabase `xdinubduvlxattlpjrvu`.
- **Estado no momento:** modo manutenção ligado; 101 produtos (100 de teste `[TESTE]`), 1 cupom, 5 usuários (3 admins).
- **Modo:** revisar e relatar. Nada foi corrigido nem publicado por esta auditoria.
- **Quem fez o quê:** Dev2 (Codex) leu o código e as migrações; Dev1 (Claude) mediu com Lighthouse; o gerente consultou o banco pelo MCP do Supabase (somente leitura) e fez requisições anônimas de leitura/recusa a produção.
- Relatórios completos dos devs (fora do Git): `.maestri/fabrica-dev/briefs/auditoria-seguranca-dev2.md` e `auditoria-performance-dev1.md`.

Isto não é um pentest nem certificação. Ausência de achado numa área significa "não encontrado por este método", não "seguro".

## Segurança

### Sem achado crítico ou alto

Nenhum caminho confirmado para um visitante ou usuário comum ler dados privados, virar admin ou alterar a loja.

### Verificado em produção pelo gerente

| Verificação | Resultado |
|---|---|
| Anônimo lê `users`, `coupons`, `site_settings.*`, `site_settings.updated_by` | 401 (42501) em todos |
| Anônimo lê produtos com manutenção ligada | 200 `[]` |
| Anônimo altera a manutenção / cria produto | 401 (42501) |
| Anônimo lista o bucket `product-images` | 200 `[]` (sem policy de leitura para anon) |
| `/api/admin-dashboard` sem token | 401 |
| RLS ligado em `users`, `products`, `coupons`, `site_settings` | sim, nas quatro |
| Policies existentes | só as criadas pelas migrações + `users_select_own`/`users_update_own`; nenhuma legada permissiva |
| `authenticated` grava `users.is_admin` | não (sem privilégio de coluna; testado mais cedo com sessão comum: 403) |
| `authenticated` grava `products.view_count` / `coupons.used_count` | não (grants por coluna) |
| Chave no cliente | `sb_publishable_…` (pública) |
| Segredos no histórico do Git (`sb_secret_`, JWT, `service_role`) | nenhum; a única ocorrência de `service_role` é um comentário |
| HSTS em produção | presente (`max-age=63072000; includeSubDomains; preload`) |

Testes por papel (anônimo, usuário comum, admin) em transações revertidas foram feitos ao longo do dia, a cada migração; estão registrados na nota do projeto.

### Achados

| ID | Severidade | Achado | Status |
|---|---|---|---|
| SEC-001 | Média | A função pública `track_product_view` pode ser chamada repetidamente e inflar o contador de visualizações, mudando a estrela e a ordem. Não altera preço nem outros dados. | Confirmado (comportamento testado em transação revertida). Risco aceito por Gabriel em 07/10 como métrica aproximada. |
| SEC-002 | Média | Um `.glb` publicado pode referenciar texturas/buffers em URLs externas; o envio só confere extensão, tamanho e os 4 bytes `glTF`, e quando a otimização falha o original é enviado. Um modelo de origem não confiável faria o navegador do visitante buscar recursos de terceiros. Exige um admin subir esse arquivo. | Confirmado por leitura; não reproduzido. |
| SEC-003 | Baixa | As mensagens de cadastro/login distinguem "e-mail já cadastrado" e "e-mail não confirmado", o que pode permitir descobrir quais e-mails têm conta. | Suspeito: depende das respostas do Supabase Auth, não testadas. |
| SEC-004 | Baixa | A otimização de imagens e modelos no admin decodifica antes de checar dimensões e o limite de 20 s não cancela o trabalho; um arquivo patológico pode travar a aba do admin. | Confirmado por leitura; não reproduzido. |
| SEC-005 | Baixa | Produção não envia `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` nem `Permissions-Policy`. Não há XSS conhecido para explorar; é defesa em profundidade ausente (inclui `/admin/` poder ser embutido em outro site). | Confirmado nos cabeçalhos de produção. |
| SEC-006 | Informativa | A leitura pública de `products` inclui `created_by` (UUID do admin que cadastrou). Não expõe e-mail nem nome. | Confirmado pelos privilégios de coluna (anon lê as 18 colunas). |
| SEC-007 | Informativa | Buckets públicos e a tela de manutenção não tornam arquivos confidenciais: quem tem a URL de uma foto ou modelo continua acessando, mesmo com o produto inativo ou a manutenção ligada. A cortina é apresentação. | Confirmado como desenho. |
| SEC-008 | Informativa | O SDK do Supabase (`2.57.4`) e o glTF-Transform (`4.5.1`, só no admin) vêm de `esm.sh` com versão fixa, mas sem verificação de integridade e com dependências internas não fixadas. Código carregado na página tem acesso à sessão. | Confirmado por leitura. |
| SEC-009 | Baixa | Proteção contra senhas vazadas desligada no Supabase Auth. | Advisor do Supabase. |
| SEC-010 | Informativa | `public.rls_auto_enable()` é SECURITY DEFINER e executável por anon/authenticated. Chamada pela API devolve erro (`0A000`), por ser função de event trigger. Existia antes da loja. | Advisor + chamada anônima: 400. |
| SEC-011 | Informativa | 3 das 5 contas são admin. Não é falha; vale conferir se as três são intencionais. | Contagem no banco. |

### Recomendações, em ordem

1. **SEC-005:** adicionar em `vercel.json` `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` sem câmera/microfone/geolocalização. CSP começando em Report-Only, porque precisa acomodar scripts inline do `<head>`, `esm.sh`, o Supabase, `blob:`/`data:` do visualizador 3D.
2. **SEC-002:** validar o GLB antes de publicar (rejeitar `uri` externa em buffers e imagens; exigir estrutura válida) e só usar o original como recuo se ele passar nessa validação.
3. **SEC-009:** ligar a proteção de senha vazada no painel do Supabase (Auth).
4. **SEC-006:** tirar `created_by` da leitura pública (grant de SELECT por coluna para anon/authenticated).
5. **SEC-003:** uniformizar as mensagens de cadastro/login e conferir no Supabase a confirmação de e-mail e os limites de tentativa.
6. **SEC-004:** rodar a otimização num Worker que possa ser encerrado.
7. **SEC-008:** servir o SDK a partir do próprio site, com versão e hash registrados.
8. **SEC-001:** se o destaque de "mais visto" passar a importar comercialmente, mover a contagem para um serviço com limite por visitante.

### Não verificado

Configuração do Supabase Auth (confirmação de e-mail, lista de redirecionamento, validade e revogação de sessão, limites, MFA para admins); respostas reais do Auth para enumeração; nenhum scanner (Semgrep, CodeQL, Gitleaks, ZAP não instalados); nenhuma varredura externa, teste de carga ou criação de contas; auditoria de CVEs das dependências; modelos GLB maliciosos reais.

## Performance

Lighthouse 12.8.2, uma execução por alvo, celular simulado (4G lento, CPU 4×) e desktop.

| Alvo | Nota | LCP | TBT | CLS | Peso |
|---|---|---|---|---|---|
| Produção, home, celular | 64 | 3,6 s | 1 088 ms | 0 | 2 561 KB |
| Produção, home, desktop | 97 | 0,8 s | 139 ms | 0 | 2 560 KB |
| Produção, catálogo PT, celular | 98 | 2,3 s | 0 ms | 0 | 225 KB |
| Produção, catálogo PT, desktop | 99 | 0,9 s | 0 ms | 0 | 225 KB |
| Local sem cortina, home, celular | 73 | 2,1 s | 1 273 ms | 0 | 2 694 KB |
| Local sem cortina, catálogo PT, celular | 93 | 2,9 s | 0 ms | 0,001 | 218 KB |

- O único alvo fora do verde é a **home no celular**, por uma causa: o modelo 3D do topo. O GLB do leão (1 949 KB) e o visualizador (290 KB transferidos) são 87% do peso, e o visualizador sozinho consome 3,8 s de CPU no celular simulado.
- Com a manutenção ligada, o visitante baixa esses 2,2 MB **por baixo da tela de manutenção**, sem ver.
- O catálogo está leve; não há deslocamento de layout em nenhuma página.

### Melhorias, em ordem

1. Não carregar o 3D do topo por baixo da cortina de manutenção (baixo esforço).
2. No celular, mostrar o leão como imagem e carregar o 3D ao tocar ou só em telas grandes/conexão boa (estimado: home no celular de 64–73 para 90+; muda a primeira impressão).
3. Leão com texturas de 1024 px (~1,2–1,3 MB em vez de 2,1 MB).
4. Cache longo para CSS/JS próprios com versão na URL (hoje revalidam a cada visita).
5. Carregar o SDK de login só ao clicar em "Entrar" para quem não tem sessão (14 requisições e 66 KB a menos).
6. Reduzir a fonte Dancing Script (42 KB) usada só no nome da transição.
7. Trocar a foto de `picsum.photos` da seção de bastidores por uma própria.
8. Regravar pelo admin os 5 modelos de produto antigos (~4 MB cada) para passarem pela otimização.
9. Índices nas chaves estrangeiras `created_by`/`updated_by` (aviso informativo do Supabase; irrelevante no volume atual).

### Não medido

Catálogo e carrossel **com produtos** (em manutenção o visitante anônimo recebe zero itens, então cartões, fotos, rolagem infinita e modelos de produto não entraram em nenhuma medição); usuário logado e admin; interação (INP); celular real; variação entre execuções.

## Correções aplicadas em 2026-10-07

Autorizadas por Gabriel: itens 2 (SEC-005), 3 (SEC-009) e 4 (SEC-006) da lista; o item 1 de performance (3D sob a cortina) ficou de fora por decisão dele.

- **SEC-005 — corrigido** (`7cd8a8c`, `vercel.json`). Produção agora envia `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` sem câmera, microfone, geolocalização, pagamento e USB, e `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`. Conferido nos cabeçalhos de `/`, `/admin/` e de um arquivo de `/assets/`. A CSP ainda não restringe scripts nem conexões: isso exige tratar os scripts inline e testar login, 3D e `esm.sh`.
- **SEC-006 — corrigido** (`7cd8a8c`, migração `products_public_columns`, aplicada). `anon` e `authenticated` leem `products` por uma lista de colunas sem `created_by`. Conferido: 42501 ao pedir `created_by` (anônimo pela API e admin em transação revertida); vitrine, lista do admin, insert/update/delete de admin e o contador continuam funcionando.
- **SEC-009 — pendente.** A proteção contra senhas vazadas é uma configuração do Supabase Auth; as ferramentas disponíveis nesta sessão não alteram configuração de Auth. Fica com Gabriel, no painel do Supabase.