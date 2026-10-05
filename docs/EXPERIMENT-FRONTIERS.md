# Próximas fronteiras de experimentação

Discussão de Pedro em 2026-10-05: Pokémon antigo em um emulador oferece um
alvo favorável; Don’t Starve e Minecraft poderiam expor limites diferentes.
Os ensaios abaixo são propostas, sem execução ou qualificação declarada.
A missão atual continua sendo preparar Slowqueen para Whitney.

## Capacidades distintas

| Alvo | Capacidade a investigar | Limite da transferência |
| --- | --- | --- |
| FNaF | Prazos, contatos temporais e estratégia específica | Uma campanha não qualifica outro jogo |
| Pokémon Gold | Menus, turnos, planejamento e roteiro situacional por LLM | Estados de espera e informação auxiliar facilitam a operação |
| Don’t Starve | Exploração, recursos, tempo e interrupções | O mundo pode mudar enquanto o supervisor decide |
| Minecraft | Câmera, orientação, navegação e interação em 3D | Movimento e rotação alteram a posição dos objetos na tela |

## Planejamento e controle local

A hipótese é separar decisões de objetivo de ações recorrentes. A LLM interpreta
situações novas e escolhe objetivos; um controlador local executa trechos
limitados, observa progresso e interrompe diante de condições definidas.
A frequência necessária deve ser medida. Não se presume que chamadas à LLM
cumpram prazos de reação. Esse controlador ainda precisa de implementação e
qualificação.

Isso concretiza a [política de percepção](PERCEPTION-AND-SPEED-POLICY.md):
escolher um local para uma base pode justificar parecer da LLM; acompanhar
queda de vida durante movimento pode justificar detector recorrente;
coletar recursos até um limite, interrompendo diante de perigo, combina ambos.

Executar um roteiro completo exige observações durante a execução, condições
de parada e orçamento de recuperação. Arrastos, movimento contínuo e contatos
simultâneos precisam de qualificação própria; um toque de menu não os qualifica.

## Don’t Starve: recursos e tempo

A [descrição oficial da Klei](https://www.klei.com/games/dont-starve/)
apresenta sobrevivência, exploração e gestão de recursos como elementos do jogo.
Primeira missão proposta: coletar materiais, preparar iluminação e atravessar
a primeira noite. Registrar edição e configuração; combate fica para depois.

Qualificar deslocamento, interação e leitura de inventário antes de compor a
missão. Critérios: inventário observado antes/depois, preparação concluída antes
do limite temporal, sobrevivência confirmada e interrupções registradas.
Medir tempo sem progresso, recursos gastos, dano, latência de reação e
recuperações. Verificar o comportamento de pausa no alvo; não transferir
hipóteses entre single-player e multiplayer.

## Minecraft: câmera e espaço

Os [esquemas oficiais de controle do Bedrock](https://learn.microsoft.com/en-us/minecraft/creator/documents/controlschemes?view=minecraft-bedrock-stable)
distinguem movimento e câmera, inclusive no toque. Primeira missão proposta,
em um mundo separado de teste: alcançar um marco, colocar um bloco em um local
definido e voltar ao ponto de partida. Começar em Creative reduz variáveis de
sobrevivência; o resultado não qualifica Survival ou combate.

Qualificar a relação entre arrasto e rotação, movimento e aproximação, e mira
e interação. Usar correções curtas por imagem antes de exigir um mapa completo.
Critérios: marco alcançado, bloco no local correto e retorno confirmado.
Medir erro de orientação, colisões, perda de referência e correções. Não
inventar erro em metros sem uma referência que permita medi-lo.

## Informação auxiliar é uma condição experimental

Comparar operação pela tela com operação assistida por integração quando houver
uma interface apropriada. A [API de scripts do Bedrock](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/ScriptAPI/minecraft/server/Entity.md)
oferece consultas de direção de visão e do bloco interceptado. Uma integração
de leitura poderia auxiliar diagnóstico; não está instalada ou exercitada aqui.

Registrar separadamente evidência visual, informação interna, documentação e
inferência. Fontes do jogo, estado salvo e APIs podem explicar erros e fornecer
referências independentes; não devem aparecer como capacidade visual do agente.
Comparações precisam declarar quais informações cada condição recebeu.
O operador geral deve poder trabalhar sem essas fontes.

## Ordem proposta

Concluir a missão Gold, consolidar evidências e qualificar o fluxo entre sessões.
Depois escolher uma dessas missões para investigar a próxima lacuna. Esta
discussão amplia a agenda de pesquisa; não autoriza instalação, compra ou início
de outra missão no aparelho.
