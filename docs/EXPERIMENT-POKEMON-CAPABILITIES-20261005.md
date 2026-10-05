# Pokémon: capacidades e limites do operador

Experimentos exploratórios em 2026-10-05, com o aparelho conectado e o
emulador inicialmente fora de primeiro plano. O objetivo é testar os limites
do Android Operator Studio. O [protocolo](experiments/POKEMON-20261005.protocol.json)
registrou perguntas e bounds antes de ações no alvo. O harness foi adaptado
durante a exploração; não foi um benchmark com instrumento congelado.

O [registro gerado](evidence/pokemon-experiments-20261005.json) retém resultados
originais, hashes de fontes e referências das capturas locais. PNGs e XML
ficam em `.operator`; nenhum frame de jogo entra no Git. Leituras e planos
passam pelo MCP real do Studio. Lease, SNAP e preparação de captura usam
interfaces existentes do FNaF. Os contatos são diagnósticos ADB limitados,
fora do executor de produção; os resultados visuais são revisão do agente.

## Resultado por pergunta

| Experimento | Observado | O que significa para o projeto |
|---|---|---|
| Entrada sem alvo preparado | Launcher `org.fossify.home`; abertura COLD do My OldBoy 2.0.3 trouxe a lista de ROMs. “Pokemon Red” foi selecionado pelo texto e bounds do item. Houve uma tela transitória de sincronização; depois apareceu a cena da porta do ginásio com o texto de porta trancada. | Descoberta e navegação entre UI semântica e conteúdo por pixels são necessárias no mesmo fluxo. Pacote foreground não prova que o jogo está pronto. |
| Captura original FNaF em outro alvo | O primeiro SNAP falhou com Companion indisponível. A preparação original acionou os controles nomeados de captura/consentimento; o SNAP depois retornou PNG e timestamps nativos no emulador. Companion instalado: 16 / 0.2.0. | A integração física foi exercitada. Sua transferência ainda exige qualificar geometria e fidelidade do conteúdo. |
| Gates de estado | O mesmo plano deu FAIL no launcher, PASS no emulador e FAIL durante Home. `pokemonOverworld` ausente deu UNKNOWN. O plano nativo comum deu PASS na observação, PASS no backend e UNKNOWN no estado de jogo. | A semântica de resultados funciona no aparelho. Ainda falta um detector positivo de Pokémon: a leitura do agente não vira automaticamente um fato do runtime. |
| Contatos de menu | Um Start nominal de 20 ms e um de 150 ms abriram o menu. B de 150 ms fechou o diálogo inicial e os dois menus. | Não há evidência de que 150 ms seja o mínimo. A duração recebida pelo jogo, a confiabilidade e a causa das falhas do primeiro desafio continuam UNKNOWN. |
| Interrupção e retomada | Home trouxe o launcher; o gate passou a FAIL. A abertura com flags de launcher retomou `.EmulatorActivity` em HOT, com a mesma cena e diálogo observados. | Há uma recuperação pontual demonstrada por diagnóstico. Não testa morte do processo, nem oferece ainda um fluxo de recuperação com contatos no plano comum. |
| Recusa de replay inadequado | O MCP recusou o plano com contato Android antes de iniciar uma execução. Após detectar deslocamento de controles, o harness também recusou a binding experimental. | O resultado preserva um limite conhecido em vez de transformar contatos aceitos em qualificação de replay. |

## O achado principal: dimensões não são uma identidade de geometria

O ADB retorna **1080 × 2400**. O SNAP original retorna **2400 × 1080**,
com a tela retrato reduzida e centralizada no buffer. Coordenadas da imagem
nativa e coordenadas físicas de toque pertencem a espaços diferentes.
O adaptador atual não fornece uma transformação qualificada entre eles.

Mesmo usando o frame físico, apareceu outro problema. O frame usado para
inferir os controles foi capturado durante a entrada da tarefa. A resolução
era a mesma do frame final estável, mas os controles estavam deslocados:
na linha y=1532, o traço de um oval foi de x=786..876 no frame de origem para
x=704..792 no frame final. O sucesso dos contatos não valida esse perfil.
A [revisão da binding](experiments/POKEMON-20261005.controls-review.json)
o marca como impróprio para replay, e uma chamada posterior verificou a recusa.

A inspeção visual sugeriu partes do jogo ou controles ausentes em alguns
SNAPs. **Correção na [segunda rodada](EXPERIMENT-POKEMON-ROUND2-20261005.md):**
os pixels RGB de toda a região dos controles, nos seis PNGs antigos auditados,
são idênticos aos de uma captura completa. A inferência de controles ausentes
do arquivo é retirada. A aparência na visualização não demonstra uma falha
da captura, nem identifica sua causa. A espera fixa de 350 ms tampouco é um
critério de qualificação. O achado de deslocamento na captura física de
entrada da tarefa permanece: ele foi medido nos pixels.

O gate que falta deve conferir conteúdo/viewport e estabilidade relevantes
ao controle, além de foreground, dimensões e bounds. Um PNG válido e um ACK
de transporte não bastam para esse gate.

## O que aproveitar e o que desenvolver

O FNaF já forneceu posse exclusiva do aparelho, captura nativa com relógios,
preparação por controles nomeados e encerramento da captura. Não apareceu
uma razão para reconstruir essas interfaces nesta experiência.

As lacunas medidas para generalização são: transformação entre espaços de
imagem/input; vínculo de controles à geometria observada e estável;
detector de estado positivo para um novo alvo; conversão de exploração em
plano; e qualificação do atuador antes de contatos pelo runtime. A camada
visual deve expor esses contratos e a evidência de cada tentativa.

O plano [pokemon-native-observe.json](../examples/pokemon-native-observe.json)
pode ser aberto no editor e executado pelo MCP com o mesmo schema. Sua
condição final retorna UNKNOWN por design enquanto o detector está ausente.
Ele não representa uma automação completa de abrir e jogar Pokémon.

## Estado final e custódia

O emulador ficou no mapa diante do ginásio de Cinnabar, com o menu fechado.
A captura Companion foi encerrada pela função original; a inspeção final
confirmou emulador foreground e projeção inativa. Não houve comando de
movimento, salvamento, batalha ou alteração do save.

O novo rastro conserva cada operação e capturas distintas. Ainda não é uma
custódia completa: não há transcrição integral depositada nem todas as
versões intermediárias do harness. Os hashes registrados e essas perdas
ficam nomeados no resultado. Uma nova rodada deve congelar o instrumento
e qualificar a binding estável antes de repetir contatos.

Para rederivar o relatório sem operar o aparelho: `npm run build` e
`node dist/experiments/report-pokemon.js`, no host que retém `.operator`.
O harness de operação é `dist/experiments/pokemon.js`; ele seleciona um único
aparelho autorizado. A configuração original usava `OPERATOR_FNAF_ROOT`;
agora o checkout opcional vem de `.operator/config.json`, em
`integrations.fnaf.checkout`. Os verbos são fechados e a
binding de contato desta sessão permanece recusada.
