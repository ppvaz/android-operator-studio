# Missão Slowqueen — 2026-10-05

**Pausada a pedido de Pedro, pelo limite de uso do Codex.** Pedro pediu uma preparação completa para Whitney usando
Pokémon que pretende manter, preservando Curse. A missão ainda não atingiu
esse objetivo: Slowqueen está no nível **12, com 45/45 HP**, após vitórias contra
Kim e Ivan na Route 35. A equipe está curada. O jogo foi fechado normalmente.

## Retomada após o encerramento

Última posição visual: Route 34, junto à entrada oeste do Day Care, ainda fora.
Slowqueen **não foi depositada novamente**. Golpes confirmados na tela, nesta
ordem: **Tackle, Growl, Headbutt, Curse**, todos com PP cheio. O plano é depositar
somente após confirmar a seleção e os recursos para retirada: na fila conhecida
deste jogo, Water Gun no 15 substitui Tackle; Confusion no 20 substitui Growl.
Isso preserva Headbutt e Curse. O circuito de caminhada ainda não foi validado
nem executado; não tratá-lo como um loop pronto ou ganho de velocidade medido.

Contra Ivan, Slowqueen recebeu 172 XP do primeiro Diglett e 120 do último,
atingindo o nível 12. Flaaffy enfrentou Zubat e Hoothoot, o último Diglett.
Uma troca inferida selecionou Slowqueen por engano; foi corrigida antes da
vitória. No Center, todos os HP foram confirmados: Slowqueen 45/45, Bellsprout
43/43, Quilava 49/49, Flaaffy 52/52, Hoothoot 46/46 e Wooper 41/41.

Regra da retomada: **nenhum consumo de itens pela automação**, cura gratuita
no Pokémon Center. A TM02 foi usada antes dessa nova regra; nenhum item de
cura foi usado. Fast forward permanece desligado. Falta atingir os marcos de
preparação; não houve vitória contra Whitney.

Até o pedido de encerramento, decorreram cerca de **2h55 desde o início do
treino** (22:10–01:05 UTC), aproximadamente **4h50 desde a rodada de experimentos
Pokémon**. Esses tempos são de sessão, não do relógio do save. Pesquisa,
revisões excessivas, erros de menu/troca e quedas de Wi-Fi contribuíram. O nível
12 alcançado não justifica esse custo como fluxo eficiente de treinamento.

## Resultado concreto até o checkpoint

- Slowqueen foi retirada do Day Care por 600, do nível 6 para o 11.
- Headbutt foi ensinado com TM02; Curse foi preservado. Headbutt passou à
  primeira posição e Curse à quarta, por operação normal do menu de combate.
- O grupo foi curado e a navegação chegou à Route 35.
- Contra o Vulpix nível 15 de Kim, Slowqueen usou Curse e dois Headbutt,
  ganhou **202 XP** e permaneceu com **35/42 HP**. Não houve level-up.

Equipe observada antes do treino: Slowqueen 11, Bellsprout 15, Quilava 17,
Flaaffy 16, Hoothoot 15 e Wooper 14. Não foi usado Machop. O plano seguinte
prioriza treinadores acessíveis e favoráveis à Slowqueen, cura conforme HP/PP,
Water Gun no 15 e Confusion no 20, preservando Curse; Flaaffy pode obter
Thunder Wave no 18. Esses marcos são planejamento, não resultados entregues.

## De onde vieram as decisões

Telas do aparelho sustentam decisões e resultados de menus e combate. A
pesquisa também consultou a desmontagem pública `pret/pokegold` e uma leitura
local do estado automático do emulador, sem alterá-lo. Essas fontes auxiliares
informam golpes, EXP e candidatos a treinadores pendentes. A correspondência
de flags é uma inferência validada parcialmente, não uma leitura visual de
todos os treinadores. A presença e derrota de Kim foram confirmadas no jogo.

O código do jogo é um auxílio opcional deste alvo. Outros aplicativos podem
exigir exploração visual, metadados disponíveis ou integração autorizada.
Não depende dele o transporte geral, e não se publica ROM, save ou código
integral de terceiros neste repositório.

## Controlador situacional

O adaptador usa parecer da LLM ligado ao hash de uma captura recente, válido
por até 90 s e consumido uma única vez. Decisões inferidas são identificadas;
despacho sem julgamento posterior permanece UNKNOWN. O runtime comum executa
contatos limitados, com lease, verificação de foreground e liberação do HID.

Continuações simples de A podem formar um bloco de até oito contatos e até
12 s de espera nominal acumulada. Blocos podem combinar direções e confirmações
na mesma conexão HID. A captura passa a ocorrer ao final por padrão; captura
por contato permanece opcional. Entre contatos inferidos, o registro conserva
a imagem e o horário antigos, marca captureDeferred e não fornece um resultado
verificado. Há interrupção quando falta despacho ou a captura final. Essa
mudança busca reduzir leituras entre textos previsíveis; seu ganho total ainda
não foi medido. Ela
não autoriza decidir golpes novos ou menus inesperados sem revisão.

O fast forward foi experimentado brevemente e voltou a ficar desligado.
Revisões normalmente abrem o menu do emulador; ainda não medimos de forma
independente se esse menu interrompe o relógio do jogo. Para trabalho prolongado
no código, usamos Close normal. Não houve rollback do relógio, edição do save
ou restauração de um estado anterior.

Nesta continuação, o sensor de pesquisa mudou para ADB screencap com recorte
dinâmico do vídeo físico. Uma captura nativa omitiu o jogador; um testemunho
direto posterior o mostrou. A comparação não foi sincronizada e a causa segue
desconhecida. ADB continua sendo sensor diagnóstico, sem qualificação temporal.
Um erro inicial da captura adiada produziu um resultado falso em vez de ausente:
o runtime esperou até o deadline e o processo pai encerrou a operação antes do
relatório terminal. O menu foi recuperado manualmente e o resultado adiado foi
corrigido para UNKNOWN, com teste de regressão. A recuperação automática do menu
após deadlines continua uma limitação a resolver antes de execução desassistida.

## Ganhos para o projeto

Captura, HID e lease foram extraídos do FNaF para `@android-operator/device`.
Um artefato instalado isoladamente capturou o telefone sem importar o checkout
de origem. O teste de exclusão mútua com o lease original foi bidirecional em
uma identidade sintética; adoção do pacote pelo consumidor FNaF segue aberta.
Veja a [evidência do pacote](evidence/android-device-20261005.json).

O roteiro passou a derivar os controles do XML do My OldBoy e da SurfaceView
Android. Headbutt foi efetivamente acionado com essa geometria. A seleção de
subregiões de Start/Select e do direcional ainda depende de interpretação
qualificada; veja [geometria do emulador](EMULATOR-LAYOUT-GEOMETRY.md).

A sessão migrou de USB para depuração sem fio e recuperou a conexão após perda
do ponto de acesso, sem novo pareamento. A identidade física para lease passou
a ser separada do endereço de transporte. Uma falha de registro no InputReader
interrompeu a sequência; o timeout de prontidão foi ajustado, sem alegar que a
causa esteja resolvida. Outra falha inicial revelou um erro de serialização do
relatório quando ainda não existia outcome; esse erro foi corrigido. A ação
planejada nessa tentativa não chegou a registrar intenção de contato.

Esses resultados são de pesquisa nesta sessão. A missão não é um piloto
autônomo repetível, e os backends públicos da UI/MCP continuam somente leitura.
O [checkpoint derivado](evidence/pokemon-gold-20261005.json) identifica os
registros locais que sustentam estes resultados e suas limitações.
O [protocolo LLM](experiments/POKEMON-GOLD-LLM-20261005.protocol.json) registra
o contrato exercitado. O protocolo de treinamento com detectores específicos
é uma proposta anterior não executada. A
[política de percepção e velocidade](PERCEPTION-AND-SPEED-POLICY.md) consolida
a escolha futura entre detector, LLM e combinação pelos custos e limites reais.
