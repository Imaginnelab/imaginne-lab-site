# Rascunho para Projetos/Imaginnelab/Visao geral.md

Fonte/data: next-fase2b-dev2-briefing.md, legado e contratos do Dev1, 09/10/2026. Destino existente consultado; cofre fora da área gravável. Estado: telas next-admin-telas entregues para revisão; dependem de três Actions de leitura e compilação final. Sem aceite de paridade ou encerramento global de SEC-002.

Implementação: página protegida com perfil/permissão/manutenção e dois lotes de 12 no servidor; abas com hash/contagem/transições; listas, formulários de produto/cupom, CRUD pelas nove Actions existentes; fotos WebP até 1400 px, GLB otimizado, upload/duplicação no Storage e descarte. CSS/legacy/servidor do Dev1 preservados; nenhuma dependência nova instalada.

Decisões: consultas server-only não podem ser importadas em cliente como Actions. O briefing proíbe criar Action faltante; read-actions.ts tem stubs explicitamente falhos para loadAdminProducts, loadAdminCoupons e loadAdminMaintenance. Paginação/busca/retry/reload de listas filtradas ou longas aguardam Dev1. Perfil/primeiras páginas e writes estão conectados.

SEC-002: inspector rejeita URIs externas de buffers/imagens antes de otimizar, usar original, duplicar ou pré-visualizar. Upload de navegador não substitui autoridade no servidor/Storage; gerente/Dev1 deve avaliar validação de inspectFiles e modelos existentes. glTF-Transform 4.5.1 continua por esm.sh conforme pedido, sem npm. Não foi executado import remoto ou backend real.

Resposta perdida de gravação é incerta: preserva uploads e bloqueia repetir Salvar, pois pode já existir registro referenciando a mídia. Falha confirmada limpa somente arquivos novos. Limpeza recusada pelo Storage pode deixar órfãos e não foi validada ativamente.

Verificação: 220 chaves iguais e JSON válido em EN/PT/ES; 209 textos extraídos por idioma comparados sem divergência; git diff --check. Onze casos isolados do inspector em V8 após remoção de tipos e shim UTF-8 mantiveram controle/comportamento e rejeitaram variantes externas. Não é compilação, browser, cena glTF semântica, suite, runner formal post-patch-validation ou validação completa de patch. Node/npm/uv não descobertos no sandbox; nenhuma typecheck/build/lint/Vitest/Playwright desta versão executada por Dev2.

Skills/fontes: react-best-practices Vercel 1.0.0 (pacote do cofre), security-best-practices referências Next/React e resumo próprio 1.0.0, documentação Next local; feature/Maestri no escopo do gerente; post-patch-validation local (versão não declarada no frontmatter), aplicada só como critérios de revisão/evidência limitada, runner não utilizado. evoluir-dev-brain para manutenção proporcional; pacotes não instalados.

Aprendizados no contexto: importar tipo de módulo server-only é diferente de importar consulta em cliente; leituras usadas depois da hidratação precisam de transporte servidor autorizado. Validar o original antes de qualquer recuo evita devolver um GLB inseguro quando o otimizador falha. Perda da resposta de gravação exige distinguir falha confirmada de resultado incerto antes de remover arquivos.

Relatórios: .maestri/fabrica-dev/briefs/next-fase2b-dev2.md e next-fase2b-dev2-sec002.json. Gerente publica marcos, sem painel pelo Dev2. Commit concorrente ecec5a2 incluiu arquivos durante a escrita; há alterações posteriores para revisão. Próximo: Dev1 integrar leituras e compilar, gerente testar em isolamento/paridade e decidir dependência npm/controle GLB no servidor. Nenhuma preferência geral inferida.

