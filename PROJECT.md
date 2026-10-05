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

Sua ambição cobre as noites dos **quatro jogos**, reconstrução das mecânicas,
comparação com o aparelho, estratégia, execução, caminho humano e prova.
O novo projeto generaliza a infraestrutura e a autoria. Mecânicas,
estratégias, calibragens e critérios de vitória continuam pertencendo aos
alvos; um resultado de um jogo não qualifica os outros.

A primeira integração invoca o compilador/runner de Night 1 em dry-run e
oferece o SNAP original sob o lease original. Extração para pacotes e consumo
direto pelo checkout FNaF são próximos passos, com comparação de contratos.

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
| Primeiro consumidor FNaF | Rotina existente invocada, gates preservados, relatório retido | Dry-run integrado; captura física pendente |
| Fluxo físico curto | Estado final observado, pacote de evidência e falhas retidas | Aberto |
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
O celular tornou-se indisponível durante o trabalho; a integração física
aguarda reconexão. Os resultados medidos estão nos registros gerados.

## Documentos de apoio

- [Anatomia do desafio Pokémon](docs/EXPERIMENT-POKEMON-20261005.md).
- [Arquitetura e interfaces consumidas](docs/ARCHITECTURE.md).
- [Produto](docs/PRODUCT.md) e [roadmap operacional](docs/ROADMAP.md).
- [Pesquisa e proveniência](docs/research/README.md).
- [Evidência gerada](docs/evidence).
