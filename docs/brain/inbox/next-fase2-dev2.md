# Rascunho para Projetos/Imaginnelab/Visao geral.md

Fonte/data: briefing next-fase2-dev2-briefing.md, legacy/public e fontes de next-migration, 09/10/2026. Nota existente consultada no cofre; escrita externa não realizada por estar fora da área gravável. Estado real: implementação Dev2 entregue para revisão, compilação final pendente com Dev1; sem aceite de paridade.

Portado catálogo público: primeira página no servidor da home e rotas /products/, /pt/products/, /es/products/; DTO mínimo, leitura paginada e contagem via Server Actions. Componentes cliente incluem galeria, 3D com biblioteca dinâmica, fila de download/pool, carrossel com arrasto/inércia, grade infinita e busca. CSS/legacy preservados; nenhum pacote novo instalado.

Decisões: servidor usa cookie do visitante e RLS, manutenção conferida na Action além do layout, Zod limita termo/locale/offset/UUID. Produto mais visto ocupa uma das 12 posições iniciais e é excluído das seguintes. Contagem anônima é permitida pela RPC atual, uma tentativa por produto/sessão; não foi tornada uma métrica antifraude. Geração de busca evita respostas antigas; viewers, eventos, timers e Blob URLs têm descarte.

Verificação própria: leitura/revisão de código, três JSON válidos com 260 chaves iguais, git diff --check passou. Não rodou compilação/testes/browser nem backend real. Dev1 registrou dois erros intermediários de compilação em SearchBox.tsx:8 e usePagedProducts.ts:44, sem diagnóstico completo no estado. A estrutura final store.search está presente nos três dicionários e a inferência da deduplicação foi corrigida com generic ProductDTO explícito; aguardam recompilação. Não confundir testes do admin com validação do catálogo.

Diferenças: conteúdo inicial em HTML, Actions no lugar de acesso/escrita direta pelo navegador, main do catálogo integrado ao layout, hosts React para custom element, descarte em navegação/busca. Sem JS há os primeiros produtos, sem interações/páginas seguintes. Paridade de aparência/gestos depende de navegador e comparação com legado.

Skills/referências: react-best-practices Vercel 1.0.0 e regras aplicáveis; security-best-practices Next/React e resumo React/Next; feature/Maestri no escopo de implementador, guias locais Next 16.4, evoluir-dev-brain. Fontes foram consultadas, sem instalar skills/dependências ou afirmar auditoria completa.

Aprendizados reutilizáveis neste contexto: helper genérico com entrada unknown pode perder inferência (freshRows exige generic explícito); hidden pode ser sobreposto por display:grid do CSS; Server Actions precisam validar entrada e proteção de manutenção mesmo com layout gate. Downloads imperativos e componentes React requerem propriedade clara do DOM e descarte de recursos; estatística não deve interromper navegação.

Relatório completo e fase 1 incluída: .maestri/fabrica-dev/briefs/next-fase2-dev2.md. Gerente publica marcos; não executar painel.mjs. Próximo: Dev1 recompilar e gerente validar navegador/paridade com ambiente isolado. Nenhuma preferência geral inferida.
