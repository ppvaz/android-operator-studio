# Escopo e plano consolidado

Decisões de Pedro e entrega inicial da sessão de **2026-10-05**.
**Android Operator Studio** é o nome provisório até branding adequado.

## Propósito

Uma pessoa e uma IA devem poder explorar um dispositivo Android, criar e
editar o mesmo plano de automação, executá-lo e entender por que cada etapa
passou, falhou ou permaneceu desconhecida. O plano deve existir fora da
conversa e preservar semântica, versão e identidade entre interface visual,
CLI e MCP.

O produto atende aplicações Android, uso do sistema, jogos baseados em
menus/pixels e, mediante qualificação específica, jogos temporais. O objetivo
inclui criação, configuração, repetição, acompanhamento e diagnóstico.

## Relação com o FNaF

O FNaF é a fonte prioritária de componentes de interação com o celular e o
primeiro consumidor demonstrado. Pedro o definiu como nossa “mina de ouro”:
o trabalho existente já atingiu muitos de seus objetivos específicos e não
deve ser substituído por uma reconstrução indiscriminada.

A [anatomia do Pokémon](docs/EXPERIMENT-POKEMON-20261005.md#o-que-o-fnaf-já-explorou)
cruza as sete fragilidades da operação improvisada com interfaces e evidências
já existentes no FNaF. Elas orientam o consumo e a generalização; não são
sete problemas inéditos a reimplementar. Existência na origem, integração
no Studio e qualificação em outro alvo são estados distintos.

Sua ambição cobre as noites dos **quatro jogos**, reconstrução das mecânicas,
comparação com o aparelho, estratégia, execução, caminho humano e prova.
O novo projeto generaliza a infraestrutura e a autoria. Mecânicas,
estratégias, calibragens e critérios de vitória continuam pertencendo aos
alvos; um resultado de um jogo não qualifica os outros.

A integração opcional invoca o compilador/runner de Night 1 em dry-run.
Captura, HID e lease foram extraídos para o pacote privado independente
`@android-operator/device`, com origem rastreada. Seu artefato npm instalado
isoladamente capturou o aparelho sem importar o checkout FNaF. Consumo desse
pacote pelo FNaF, estabilidade entre sessões e extração do APK seguem abertos.

## Estratégia técnica

**Integrar primeiro; reconstruir quando uma lacuna medida justificar.**
O código próprio concentra-se no contrato de plano, na orquestração,
nos gates durante execução e no diagnóstico. Captura, transporte, percepção,
temporização e runners devem aproveitar interfaces existentes quando
preservarem os requisitos. O FNaF vem primeiro; as ferramentas mapeadas na
pesquisa são alternativas a comparar, sem adoção automática.

Interfaces substituíveis permitem usar backend semântico para aplicações,
percepção por pixels em superfícies opacas e executor local para contatos
temporais. Nenhum resultado autoriza afirmar um backend universal.

## Capacidades no escopo

1. Descoberta de dispositivo, contexto, capacidades e identidade de sessão.
2. Observação nativa, regiões e detectores vinculados ao alvo.
3. Ações limitadas e execução temporal local onde o prazo exige.
4. Plano compartilhado com condições, saídas, loops, deadlines e recuperação
   com orçamento finito.
5. Editor visual e, para jogos temporais, timeline de contatos/observações.
6. Ferramentas MCP para autoria, validação, execução, observação e cancelamento.
7. Evidência e diagnóstico causal por etapa e tentativa.
8. Qualificação de backends por aparelho, build, geometria, carga e alvo.

## Compromissos de execução

Enviar uma ação não prova aceitação pelo aplicativo. Ausência de observação
é UNKNOWN. FIXTURE, MODEL_ONLY e DEVICE_MEASURED são escopos distintos.
Relógios e unidades permanecem explícitos; latência cruzada requer um mapa
de relógio com erro e validade. Execução temporal não aguarda um turno de
LLM por contato.

Leases, preflight, perfis, bounds e liberação vêm das interfaces exercitadas,
preservados ao integrar. Um mecanismo não é confiável só por declarar MCP,
tempo real, multitoque ou validação. Medir o comportamento observável.

## Plano por entregas

| Entrega | Critério de conclusão | Estado inicial |
|---|---|---|
| Contrato comum | UI/CLI/MCP concordam em schema e hash; fixture cobre resultado e interrupções | Implementado e testado |
| Primeiro consumidor FNaF | Rotina existente invocada, gates preservados, relatório retido | Dry-run integrado; SNAP original exercitado no Pokémon; geometria e estabilidade abertas |
| Fluxo físico curto | Estado final observado, pacote de evidência e falhas retidas | Menu/equipe/retorno Pokémon passou no executor comum com adaptador de pesquisa; UI/MCP físicos ainda abertos |
| Backend comparado | Mesmo alvo/protocolo em bases candidatas; decisão ligada ao resultado | Aberto |
| Autoria de operação real | Exploração/gravação resulta em plano revisável e repetível | Aberto |
| Execução temporal | Deadline e contatos confirmados em alvo/carga declarados | Aberto; usar infraestrutura FNaF existente |
| Expansão e branding | Novo alvo qualifica o mesmo contrato; identidade de produto decidida | Aberto |

## Critérios de produto

Uma automação deve ser criada por pessoa ou agente, revisada pela outra
interface e executada sem depender da conversa original. Cada repetição
confere as condições relevantes. Ao falhar, deve reter informação que permita
distinguir percepção, despacho, aceitação, timing e estratégia — ou registrar
que essa atribuição ainda é UNKNOWN.

Medir separadamente custo de autoria, custo de repetição, taxa de sucesso,
recuperações, perdas e cumprimento de prazo. Os cenários iniciais são uma
aplicação semântica, um jogo de menus/pixels e um jogo temporal. Uma execução
bem-sucedida ou três smoke runs não sustentam confiabilidade geral.

## O que esta primeira versão entrega

Schema `operator-plan/v1`, editor de blocos/JSON, CLI, servidor MCP oficial,
executor limitado, fixture de contato com confirmação posterior, rastros
locais e registros derivados. A integração FNaF reutiliza CLIs existentes;
a captura Companion preserva o lease e os timestamps nativos. O backend ADB
separado oferece um snapshot diagnóstico independente.

Autor e committer usam **GitHub noreply**, com o mesmo gate do FNaF em hooks
e CI. Não há exceções históricas importadas. O repositório está privado na
conta de Pedro, com o nome provisório acordado.

Não se declara nesta entrega uma nova vitória no aparelho, confiabilidade
geral, superioridade de fornecedor ou controlador temporal qualificado.
O celular tornou-se indisponível durante o bootstrap e foi reconectado para
os [experimentos Pokémon](docs/EXPERIMENT-POKEMON-CAPABILITIES-20261005.md).
A [segunda rodada](docs/EXPERIMENT-POKEMON-ROUND2-20261005.md) mediu a relação
entre imagens, reutilizou o HID original em retrato e executou um fluxo curto
no runtime comum com estados reconhecidos. É um resultado de pesquisa nesta
sessão; admissão pela UI/MCP e qualificação entre sessões permanecem abertas.
Os resultados medidos estão nos registros gerados.

## Documentos de apoio

- [Anatomia do desafio Pokémon](docs/EXPERIMENT-POKEMON-20261005.md).
- [Experimentos de capacidades e limites no Pokémon](docs/EXPERIMENT-POKEMON-CAPABILITIES-20261005.md).
- [Segunda rodada: captura, reconhecimento e execução física](docs/EXPERIMENT-POKEMON-ROUND2-20261005.md).
- [Missão Gold: Slowqueen, controlador situacional e limites](docs/EXPERIMENT-POKEMON-GOLD-20261005.md).
- [Arquitetura e interfaces consumidas](docs/ARCHITECTURE.md).
- [Produto](docs/PRODUCT.md) e [roadmap operacional](docs/ROADMAP.md).
- [Pesquisa e proveniência](docs/research/README.md).
- [Experimentos futuros: Don’t Starve e Minecraft](docs/EXPERIMENT-FRONTIERS.md).
- [Geometria pela configuração do emulador](docs/EMULATOR-LAYOUT-GEOMETRY.md).
- [Evidência gerada](docs/evidence).

## Percepção adaptada à tarefa

Escolher entre detector, parecer da LLM e combinação pelos custos de autoria e
repetição, prazo e consequência do erro. Roteiros situacionais podem usar a LLM
sem construir um detector para cada tela. Decisões inferidas ficam identificadas,
e critérios críticos continuam exigindo evidência. A mesma escolha considera
velocidade de execução/fast forward e a capacidade de observar o próximo limite.
A [política de percepção e velocidade](docs/PERCEPTION-AND-SPEED-POLICY.md)
especifica os dados e critérios; sua seleção automática ainda é uma entrega futura.

## Fronteiras de generalização

Don’t Starve e Minecraft são alvos propostos para testar recursos e reação em
um mundo em movimento, e câmera/navegação em 3D. O
[plano de experimentos](docs/EXPERIMENT-FRONTIERS.md) define missões pequenas,
critérios observáveis e separação entre operação visual e informação auxiliar.
Essas capacidades ainda não foram demonstradas; concluir a missão Gold precede
abrir outra frente de execução.
