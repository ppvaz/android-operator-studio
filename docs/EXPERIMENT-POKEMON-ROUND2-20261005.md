# Segunda rodada Pokémon — 2026-10-05

O fluxo mapa → menu Pokémon → equipe → mapa passou no executor comum, no
Pokémon Red, usando o HID original do FNaF e um adaptador fechado de pesquisa.
O mesmo plano foi executado a partir do mapa e do menu já aberto. A UI e o
MCP continuam recusando contatos físicos: este resultado qualifica o ensaio
nesta cena, não um backend geral.

## Captura e correção da primeira leitura

Seis comparações ADB → Companion → ADB, cinco no mapa e uma na equipe,
mostraram controles e cabeçalho idênticos entre as capturas ADB. O buffer
nativo de `2400×1080` contém o retrato físico de `1080×2400` reduzido e
centralizado; a comparação considerou essa transformação.

A reauditoria RGB de seis PNGs da primeira rodada encontrou todos os pixels
da região de controles idênticos à referência completa. A afirmação anterior
de que faltavam controles nessas imagens foi retirada. Isso não resolve a
causa das transições observadas nem qualifica o reaproveitamento de coordenadas
depois de mudanças de geometria. O registro antigo permanece como histórico;
a correção e os hashes das mesmas imagens estão na evidência desta rodada.

## Percepção e execução

A primeira referência de mapa recusou uma imagem posterior por animação da
água: diferença média 6,647 para limite 6. A falha permanece registrada.
Uma coleção de referências da mesma sessão resolveu esse caso sem aumentar
o limite. Uma captura imediatamente após transição de equipe permaneceu
UNKNOWN; a testemunha posterior mostrou a equipe.

O plano compartilhado teve estes resultados:

| Entrada | Resultado | Contatos HID despachados |
|---|---|---:|
| Mapa | PASS | 4 |
| Menu Pokémon já aberto | PASS | 3 |
| Launcher após Home | FAIL | 0 |
| Menu com cursor em Pokédex, versão endurecida | UNKNOWN | 0 |
| Menu com cursor em Pokémon após reconexão | PASS | 3 |

Os tempos dos dois primeiros fluxos foram aproximadamente 20,7 s e 18,7 s.
São tempos do host para esses roteiros, não latência de aceitação de contatos
nem comparação entre relógios do telefone e do computador.

## Cursor e retomada fria

A média de toda a imagem do menu não detectava bem a mudança de seleção:
após Up, a diferença ainda era 1,312, abaixo do limite 6. A versão v4 exige
uma região adicional do cursor. No aparelho, essa versão recusou A com
Pokédex selecionado, aceitou o estado após Down e completou o mesmo plano.
A versão v3 foi retirada de entradas físicas.

Na reconexão, o emulador abriu a lista de ROMs. O roteiro recusou operar como
se estivesse no mapa. Uma hierarquia Android nova permitiu selecionar a linha
nomeada Pokémon Red; a primeira captura de carregamento foi UNKNOWN, e a
seguinte mostrou o mapa. Também ficou retida uma tentativa de preparar captura
que falhou pela ausência do controle esperado. Não houve reset, edição de save
ou detector criado para a lista de ROMs.

## Contagem e alcance da evidência

Foram 18 contatos de menu: 17 pelo HID original e um ADB diagnóstico. A
seleção semântica da ROM usou outro contato ADB, contado separadamente.
O hold nominal foi 150 ms; sua duração efetivamente aceita pelo app não foi
medida. Ao terminar, projeção e dispositivo HID de pesquisa estavam desligados.

Onze casos de reconhecimento usam rótulos do agente e testemunhas sequenciais
na mesma sessão. Não são avaliação independente e cega. O ensaio usou um
telefone, uma build e cenas existentes; não qualificou combate, movimento,
morte do processo, mudança de orientação ou estabilidade entre aparelhos.

O [registro derivado](evidence/pokemon-round2-20261005.json) reúne operações,
hashes, falhas, referências e resultados. PNGs, vetores e instrumentos originais
ficam localmente em `.operator`. O relatório é produzido por
`src/experiments/report-pokemon-round2.ts`, offline, a partir desses arquivos.
Os protocolos e o plano estão em `docs/experiments/POKEMON-ROUND2-*` e
`examples/pokemon-menu-party-research.json`.
