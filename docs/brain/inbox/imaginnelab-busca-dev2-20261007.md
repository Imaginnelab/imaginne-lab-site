# Imaginnelab — busca do site (Dev2, 07/10/2026)

Rascunho para consolidar em `Projetos/Imaginnelab/Visao geral.md`; o cofre foi consultado, mas está fora da raiz de escrita permitida desta sessão. Fonte: briefing `.maestri/fabrica-dev/briefs/busca.md` e entrega `.maestri/fabrica-dev/briefs/dev2-busca-resultado.md`. Status: implementação para revisão, sem commit/publicação/aceite.

Decisão: usar o componente `search-box.js` do gerente nas homes e no catálogo EN/PT/ES, com filtro PostgREST nas seis colunas de nome/descrição; paginação no servidor, sem baixar toda a lista. Destaque de mais visto só sem busca. URL do catálogo guarda `q`, preservando os demais parâmetros/hash. CSS de posicionamento separado para preservar os arquivos compartilhados em trabalho concorrente.

Concorrência: geração de consulta protege também respostas de paginação, destaque, erros e limpeza de loading. Reset de busca zera offset/IDs/posição; observers permanecem reutilizáveis depois de resultado esgotado. Aprendizado específico: restaurar apenas `input.value` não atualiza o termo lembrado pelo componente; a restauração usa seus eventos para permitir a primeira limpeza.

Verificação: dez cenários de lógica passaram em V8 isolado com DOM/API/URL simulados; hosts/CSS presentes uma vez nas seis páginas; diff sem erros de whitespace. Não houve Node, navegador, Supabase ou testes de renderização reais. Próximo passo do gerente: suíte nativa, REST e layout/interação em desktop/390 px, temas/reduced-motion e idiomas. Sem dependência externa nova ou alteração em Auth/RLS; termo/retornos exibidos por texto/atributos seguros. Skill: `feature` (implementador). Esse resultado não declara a aplicação segura nem a busca aceita.
