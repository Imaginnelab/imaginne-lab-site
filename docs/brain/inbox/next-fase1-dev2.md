# Rascunho para Projetos/Imaginnelab/Visao geral.md

Fonte/data: briefing `next-fase1-dev2-briefing.md`, arquivos da branch `next-migration` e entrega Dev2 em 09/10/2026. Destino existente consultado no cofre; escrita externa não realizada nesta sessão.

Implementada a frente next-site da fase 1: casca pública, seis seções da home, quatro cenas de Como funciona, textos EN/PT/ES, metadata, 404 e efeitos de header/menu/reveal/transições/timeline/leão. Identidade/CSS legado preservados; conta e manutenção são componentes de servidor do Dev1. Produtos permanece em breve; catálogo/carrossel/admin são da fase 2.

Motivos/decisões: Server Components para conteúdo; props mínimas nos clientes; biblioteca 3D dinâmica após load/ociosidade; parâmetros assíncronos validados antes do dicionário; efeitos com descarte. Catch-all final fora de `(site)` para não depender dos filhos que a manutenção pode omitir, e `generateMetadata` chama notFound para locale inválido.

Verificação própria: três JSON válidos com as mesmas 214 chaves; extração comparou estrutura das três homes/catalogue; revisão de fontes e diff-check. Não rodou npm/build/testes/browser/fluxos reais de auth ou alterações no banco. Nova verificação HTTP da 404 após mover rota fica com Dev1. Não há aceite de paridade/deploy.

Skills: referências de feature/maestri, react-best-practices Vercel 1.0.0 e regras aplicáveis, security-best-practices/Next/React, referência própria React/Next 1.0.0 e evoluir-dev-brain. Nenhum pacote novo instalado. Uso dessas fontes não é prova de segurança ou funcionamento.

Aprendizados no contexto Next App Router: not-found não recebe params; validar idioma antes do carregador; gates que omitem children podem ocultar a execução de notFound; portabilidade de scripts globais para React exige remoção de eventos/observers/timers. Nenhuma preferência geral foi inferida.

Relatório completo: `.maestri/fabrica-dev/briefs/next-fase1-dev2.md`. Gerente assumiu publicação dos marcos; não executar painel pelo Dev2. Sem commit/push/merge/deploy. Próximo passo: gerente/Dev1 recompilar, repetir fumaça 404 e conferir paridade visual/idiomas.
