# Escolher percepção e velocidade

Pedro propôs durante a missão Gold (2026-10-05) que o operador calcule quando
compensa construir um detector e quando convém pedir um parecer à LLM. Para
roteiros situacionais, a autoria do detector pode custar mais que todas as
leituras necessárias. Essa escolha faz parte do escopo do produto; a política
automática ainda precisa de implementação e medições.

O controlador deve escolher por decisão, e permitir combinação de métodos.
A LLM pode interpretar estratégia e telas novas; controles simples continuam
verificando identidade, foreground, geometria, budgets e liberação. Um parecer
não transforma transporte ACK em aceitação, e uma inferência deve ficar marcada
separadamente de uma leitura da imagem.

| Informação necessária | O que comparar |
| --- | --- |
| Repetições esperadas | Uma missão única, sessões futuras e outras aplicações |
| Autoria/manutenção | Construção, qualificação, mudanças de interface e recalibração |
| Custo por leitura | Tokens, processamento, captura, transporte e tempo de espera |
| Erros | Falsas aceitações, falsas recusas, UNKNOWN, custo da recuperação |
| Consequência | Toque reversível, compra, esquecimento de golpe, perda de partida |
| Prazo | Estado estável que espera entrada ou evento transitório |
| Qualidade da evidência | Testes fora da calibração, versão, amostra e incerteza |

Para um horizonte N, comparar, na mesma unidade e com custos explícitos:

```
C_detector = autoria + manutenção + N * (leitura + erro * perda)
C_LLM      = preparação + N * (tokens + latência + erro * perda)
```

O cruzamento ajuda a decidir onde investir. Não atribuir probabilidade de erro
sem amostra apropriada, nem converter latência em dinheiro sem pesos definidos.
Quando os valores forem desconhecidos, registrar a incerteza e medir um piloto.
Custo menor não admite um método que deixe de cumprir um prazo ou uma condição
obrigatória. Para ações sensíveis, usar confirmação independente ou recusar com
UNKNOWN; escolher o parecer mais conveniente entre dois métodos discordantes
não é confirmação.

O registro de cada decisão deve identificar método, evidência, versão, tempo e
custo observado, resultado e recuperação. O estudo deve contar também leituras
que falham. O relatório separa implementação já exercitada de políticas propostas.

Informação interna do alvo, APIs e documentação são fontes auxiliares opcionais.
Registrar sua disponibilidade e uso; uma decisão assistida por elas não demonstra
percepção somente pela tela. Os [ensaios propostos para Don’t Starve e Minecraft](EXPERIMENT-FRONTIERS.md)
aplicam essa distinção e investigam planejamento com controle local recorrente.

## Fast forward depende da tarefa

Pokémon oferece pontos de espera entre turnos; é possível acelerar animações
até o próximo ponto de decisão sem exigir reação durante a animação. Caminhar,
menus com repetição de tecla e eventos em tempo real exigem nova qualificação
quando a velocidade muda. Um contato de 150 ms continua com 150 ms no host,
mas atravessa mais tempo do jogo acelerado. Não preservar a hipótese de um
passo por toque ao aumentar a velocidade.

Em um trecho que exige reação, considerar o tempo total de captura, decisão,
despacho e liberação, além do possível envelhecimento da imagem. Só acelerar
quando a margem até o próximo limite continuar observável e suficiente; sem
medição dessa margem, não declarar um fator seguro. Em estados que esperam
entrada, tempo de resposta da LLM afeta a duração da tarefa, mas não precisa
causar perda de controle. Menus de aprendizagem continuam sensíveis a entrada
repetida, mesmo quando a imagem é legível.

A política futura poderá mudar a velocidade por trecho, pausar para leitura ou
voltar à velocidade normal antes de uma decisão sensível. Registre velocidade
realmente configurada, duração do contato e resultado observado. Provar 2x em
um trecho não qualifica 4x nem uma batalha diferente.
