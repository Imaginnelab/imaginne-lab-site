---
tipo: guia
status: ativo
dominio: geral
revisado: 2026-10-07
---

# Maestri — iniciar e acompanhar trabalho

## Qual skill chamar

Use estes três comandos **no terminal gerente**. Eles reutilizam a equipe, mantêm o bloco de progresso e registram decisões no Dev Brain.

| Quero… | No gerente Claude Code |
|---|---|
| Preparar a equipe | `/initial-setup` |
| Implementar uma feature | `/feature <o que quero e como deve funcionar>` |
| Corrigir um problema | `/fix <falha, como reproduzir e resultado esperado>` |
| Criar outro projeto | `/initial-setup novo <pasta> <objetivo>` |
| Consultar o andamento | `/initial-setup status` |

Se o gerente for Codex, use **`$initial-setup`**, **`$feature <descrição>`** ou **`$fix <descrição>`**. O comando é enviado **à IA do terminal**; não é um comando PowerShell. As skills pessoais estão instaladas neste computador. Em outra máquina precisam ser instaladas novamente.

## Preparação inicial — uma vez

1. No Maestri, use o workspace do projeto. Para o atual, o diretório é `C:/Desenvolvimento/Imaginnelab`.
2. No terminal de cima: botão direito → **Edit Terminal → Details → Maestro** → salvar. Essa opção permite ao gerente criar e conectar terminais. A skill não ativa esse botão automaticamente.
3. Mantenha o gerente Claude Code, **Dev1 Claude** e **Dev2 Codex**, como no seu desenho. Confira que os implementadores estão no projeto correto e autenticados. Se Claude mostrar `Not logged in`, use `/login` nesse terminal e conclua o login.
4. No gerente, envie `/initial-setup`. Se a skill não aparecer, tente `/reload-skills` em uma versão compatível ou abra uma nova sessão do agente preservando o terminal e as conexões.
5. Confira a resposta do setup: gerente, nomes reais de Dev1/Dev2, pasta e bloco conectado. Se faltar autenticação ou Maestro, resolva o bloqueio antes de iniciar implementação.

`/feature` e `/fix` recebem a descrição diretamente, sem escrever os colchetes. Não é necessário repetir `/initial-setup` antes de cada tarefa.

O setup usa os agentes existentes e cria um bloco com nome estável ligado ao gerente e aos implementadores. São quatro terminais: gerente que chamou a skill, Dev1 Claude, Dev2 Codex e um shell Servidor web; além do browser e bloco. Não há outro Claude Code auxiliar no setup padrão. Se recursos conhecidos sumirem de list, conferir conexões antes de criar duplicatas. Recruta só quando faltar um papel. Não reinicia nem apaga os terminais existentes. Não implementa uma feature de exemplo sozinho.

## Manter a mesma disposição no canvas

No mesmo projeto, reabra o mesmo workspace: o Maestri guarda posições, tamanhos e conexões; o setup 1.3.5 reutiliza os nós. Não precisa recriar a equipe a cada uso. [Workspaces](https://www.themaestri.app/en/docs/workspaces).

Para usar esse desenho em outros projetos, salvar uma vez como **Partitura**:

1. Selecione os elementos da disposição, incluindo árvore, terminais, bloco e browser.
2. Botão direito → **Partituras → Create New…**. Nome sugerido: **Equipe Web**; escopo **Global**. Confira os comandos dos terminais.
3. Num workspace vazio de outro projeto, **Ctrl+Shift+L** → inserir a Partitura → chamar `/initial-setup` no gerente inserido.

A Partitura conserva o arranjo e as conexões, mas não processos/conversas em execução. Caminhos de trabalho vêm do workspace de destino; confira comandos e URL do preview no projeto novo. Inserir novamente num canvas ocupado duplica os nós: repetir setup deve apenas reutilizar. [Partituras](https://www.themaestri.app/en/docs/partituras).

O Claude Code que mostrou integração/stash na imagem é o **gerente**, confirmado no registro da própria sessão com maestro true. Se houver futuramente um agente separado só para testes, seu nome será **Tester**; o setup padrão não cria esse agente.

Referência visual escolhida por Gabriel:

A imagem de referência está em `IA/Maestri-canvas.png` no Obsidian.

O arquivo da Partitura ainda precisa ser salvo uma vez pela interface do Maestri; guardar esta imagem/documentação não cria a Partitura. Para automação de projeto novo, o gerente também pode copiar um workspace modelo com `workspace create --from`, após confirmar a origem em `workspace list` e os caminhos do destino.

## Implementar no Imaginnelab

Exemplo de pedido — adapte antes de enviar:

```text
/feature Adicionar filtros de categoria à seção de produtos.
Quero filtrar sem recarregar a página, ter uma opção “Todos” e manter
EN/PT/ES consistentes. Preserve a identidade visual e o uso no celular.
Use Dev1 e Dev2, mantenha o bloco atualizado e registre decisões no Obsidian.
```

O gerente consulta o projeto e o cérebro, define aceite, registra tarefas e atribui arquivos. Claude pode cuidar da interface e Codex do comportamento ou revisão; a divisão depende da mudança. Se os dois precisarem alterar o mesmo arquivo, trabalham em sequência ou em ambientes isolados, com integração planejada.

Neste projeto, `public/` contém HTML/CSS/JS e há três versões de idioma. O servidor é iniciado por **`npm run dev`**, em `http://localhost:3000`. Não há comandos de build, teste ou lint definidos no package.json consultado. A equipe deve verificar a mudança em navegador e registrar exatamente o que testou.

## Corrigir um bug

```text
/fix No celular, o menu continua aberto depois de selecionar
um link. Reproduza abrindo o menu e tocando em uma seção.
Espero que ele feche e que a navegação por teclado continue funcionando.
```

Primeiro reproduzir, depois corrigir e verificar regressão. Um agente pode implementar e o outro revisar. O gerente registra causa, resultado e limites.

## Criar um projeto novo

Exemplo com uma pasta ainda a criar:

```text
/initial-setup novo C:/Desenvolvimento/MeuProjeto
Criar um painel web para organizar pedidos, com versão inicial simples.
Proponha uma stack conforme os requisitos, use meu Dev Brain e organize
Claude e Codex com um bloco de progresso. Não publique sem meu pedido.
```

O gerente prepara a pasta/workspace e posiciona os agentes no projeto novo. Ele deve confirmar os caminhos; criar um workspace não muda automaticamente o diretório do terminal gerente. Se houver um workspace modelo que você queira copiar, informe seu nome. Não precisa recriar manualmente todas as ligações.

## Browser e recarga automática

`/initial-setup` prepara uma prévia web no canvas, ligada ao gerente e aos devs. Reutiliza portal e servidor existentes; abre só o que faltar. `/feature` e `/fix` usam essa prévia e conferem as mudanças durante a tarefa.

No Imaginnelab, use **`npm run dev`**. O comando existente agora inclui recarga automática ao salvar HTML/CSS/JS/assets; o cliente de reload só entra nas respostas locais, sem modificar os arquivos publicados. Ele roda no terminal auxiliar, sem outro agente de IA. URL padrão: `http://127.0.0.1:3000`. Se estiver ocupada, `npm run dev -- 3001` usa outra porta, preservando o processo existente. A skill prioriza o comando dev real em cada projeto, conforme sua stack e gerenciador.

Para aplicar à equipe atual, envie `/initial-setup` no gerente. Ele mantém equipe, bloco e tarefas; acrescenta ou reutiliza a prévia. Atualização visual automática não significa validação automática: os agentes conferem funcionamento, console e viewport nos marcos. Um responsável por vez controla o portal.

## Cérebro em cada tarefa e integrações

As três skills consultam o roteador, contexto, política de manutenção e nota do projeto em **cada chamada**; depois carregam só decisões e skills pertinentes. Não precisa abrir o Obsidian manualmente antes de cada feature/fix. Se o cofre não estiver acessível, o agente informa o limite.

Supabase, domínio, DNS e hospedagem podem fazer parte desse contexto. O cérebro registra configuração e decisões sem segredos; os agentes executam por ferramentas autenticadas, conforme o pedido. As skills não conectam contas nem alteram produção automaticamente só porque a integração foi mencionada.

## Codex: iniciar Dev2 sem depender do app

Comando atual do Dev2 no Maestri:

```text
C:\Users\gabri\.agents\bin\codex-maestri.cmd --no-daemon
```

Foi instalada separadamente a CLI oficial estável 0.160.1, fixada para o Maestri. O launcher usa o executável completo e não muda quando o app desktop troca suas pastas. Mantém sandbox elevated, configuração e login existentes. Binários ficam em `.agents/tools/codex-maestri`, fora do Obsidian. [Versão oficial](https://learn.chatgpt.com/docs/changelog).

Para aplicar ao Dev2 bloqueado existente, envie **no gerente do Maestri**:

```text
/initial-setup reparar-dev2
```

A skill 1.3.3 salva andamento, relança só o Dev2 bloqueado com `recruit --replace` e recompõe o contexto. Nó, bloco, browser e conexões permanecem; a sessão de conversa do Dev2 reinicia. Se a sessão gerente ainda tiver a skill antiga em memória, peça para ler `C:/Users/gabri/.claude/skills/initial-setup/SKILL.md` e sua referência `codex-windows.md`.

Só considerar pronto após o próprio Dev2 executar echo, confirmar diretório e listar nota/portal pela CLI do Maestri. Setup/status normal preserva sessões. Não precisa fechar o app Codex ou apagar o terminal.

Erros distintos: host ausente → executável incompleto; echo funciona mas CLI negada → leitura/execução da pasta Maestri; echo nem inicia com setup refresh → consultar log do sandbox. Nesta máquina, a alpha 0.162.0-alpha.2 falhou por arquivos CUA em uso, enquanto a estável passou com o app aberto. A permissão ReadAndExecute estreita da pasta da CLI permanece. [Sandbox oficial](https://learn.chatgpt.com/docs/windows/windows-sandbox).

## O que aparece no bloco

Somente **gerente OK, disponibilidade dos devs, trabalho atual e TODOs**. Exemplo ilustrativo, com estados verificados pelo gerente:

```markdown
Gerente: 🟢 OK
Dev1: 🟢 Online · Dev2: 🟢 Online

Agora: Implementando filtros

- [x] ~~Definir comportamento — Gerente~~
- [ ] Criar interface — Dev1 · em andamento
- [ ] Implementar filtros — Dev2
```

Checkbox marcado e texto riscado significam tarefa aceita pelo gerente. Pendentes ficam desmarcados; bloqueio ou revisão aparece ao lado. A tabela, os horários e os avisos foram retirados do painel. Arquivos, evidências e histórico ficam no registro interno.

“Online” depende de uma checagem real; sem confirmação aparece **A confirmar**, e falta de login aparece **Bloqueado**. O gerente verifica no setup, nos marcos e em `/initial-setup status`. Não existe monitor contínuo dos processos. As mudanças são publicadas automaticamente pelo auxiliar quando a nota está conectada; falhas preservam o estado local para sincronizar depois.

Para atualizar um bloco antigo já aberto: **`/initial-setup status`** no gerente. A skill reutiliza a nota e troca o formato, preservando anotações externas.

## Retomar e encerrar

- Para continuar: **“Use initial-setup para retomar a execução atual; confira o painel e o código antes de reenviar tarefas.”**
- Para mudar algo: descreva a correção ao gerente; ele ajusta escopo e responsáveis.
- Para finalizar: conferir aceite, evidências e pendências; atualizar a nota do projeto no Obsidian. Deploy, push, merge ou landing de floor dependem do pedido correspondente.
- Uma execução com tarefas abertas é retomada antes de abrir outra no mesmo painel.

## Sair deixando só o gerente

Não é necessário apagar código, projeto ou bloco. Se deixar os devs no canvas, mantém os terminais e suas conexões para retomar.

Para ter somente o gerente visível, envie a ele:

```text
Salve o andamento, decisões e próximo passo no bloco e no Obsidian.
Confira o trabalho dos devs antes de encerrar. Depois remova Dev1 e Dev2
do canvas, mantendo o gerente e o bloco ligados. Não apague arquivos.
```

Remover terminais do canvas encerra seus processos e perde essas sessões; não é apagar o projeto. Ao retomar, `/initial-setup` pode recriar os agentes, e o gerente recupera o contexto salvo. Não remova um dev enquanto ele ainda está editando sem antes preservar e organizar o trabalho.

## Se algo não funcionar

| Situação | O que fazer |
|---|---|
| Skill não aparece | `/reload-skills` se disponível; senão nova sessão. Pode pedir para ler `C:/Users/gabri/.claude/skills/initial-setup/SKILL.md` diretamente. |
| Erro `MAESTRI_PIPE` | Executar a skill no terminal dentro do Maestri. Esta integração não funciona a partir de um shell externo comum. |
| Sem permissão de Maestro | Ativar a opção no terminal gerente. |
| Erro Starship ao abrir PowerShell | Perfis corrigidos para inicializar Starship somente se estiver disponível. Abra uma nova sessão de shell; não precisa apagar terminais. |
| Implementador sem login | Concluir login antes de delegar. |
| Bloco parado ou bloqueado | Pedir ao gerente diagnóstico com `maestri debug`, conferir conexões e bloqueio da nota; depois sincronizar. |
| Pedido demorou/expirou | Consultar `status` e saída dos agentes; não reenviar a mesma tarefa cegamente. |

## Estado deste setup

**Preparado:** três skills pessoais 1.3.5, leitura do cérebro em cada chamada, browser e auxiliar de recarga automática. **Verificado:** 14 testes do painel, 3 testes do auxiliar de preview e 3 testes isolados pela entrada real npm run dev (recarga por alteração, arquivos originais preservados e leitura limitada à pasta). O gerente registrou painel e portal reais com npm run dev em 127.0.0.1:3000; Dev1 disponível. O executável completo resolveu o host do Dev2. A permissão de leitura/execução da CLI do Maestri foi corrigida e testada no sandbox elevado. O gerente registrou às 09h30 a substituição do Dev2 pelo launcher estável, comandos funcionando e nota/portal confirmados pelo próprio Dev2 no canvas; painel com os dois devs Online. Este chat externo não realizou a substituição. Marcos de uma implementação e controle do browser pelo Dev2 ainda não foram exercitados.

Fontes: [Maestro Mode](https://www.themaestri.app/en/docs/maestro), [Notas](https://www.themaestri.app/en/docs/notes), [Skills Claude Code](https://code.claude.com/docs/en/skills), [Skills Codex](https://learn.chatgpt.com/docs/build-skills).
