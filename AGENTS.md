# Contrato do projeto

Este repositório é o operador Android e estúdio visual geral. O nome é
provisório. A pesquisa de origem está em docs/research; não é qualificação.
`PROJECT.md` consolida escopo e plano. A branch principal é `master`.

- UI, CLI e MCP usam o mesmo schema de plano e o mesmo executor.
- TypeScript estrito; dados externos entram como unknown e são validados.
- Não confundir despacho com aceitação pelo alvo. Ausência de observação é UNKNOWN.
- FIXTURE, MODEL_ONLY e DEVICE_MEASURED são escopos distintos.
- Condições, deadlines, limites de loop e cancelamento pertencem ao runtime.
- O backend Android inicial é somente leitura. O screencap é um diagnóstico
  independente e lento; não é o sensor de um controlador temporal.
- FNaF é o primeiro consumidor e a fonte prioritária dos componentes de
  dispositivo já exercitados (Pedro, 2026-10-05). Consumir interfaces existentes
  antes de reconstruí-las; preservar licença, rastrear origem e comparar contratos.
- Mecânicas e estratégias de jogos pertencem aos adaptadores de alvo.
- npm ci para instalar; npm run verify antes de concluir mudanças.
- Autor e committer usam apenas email GitHub noreply, como no FNaF. A regra
  vale nos hooks commit-msg/pre-push e no CI de histórico completo. Nenhum
  agente contorna hooks ou acrescenta exceções para tornar o gate verde.
- Não publicar, conectar fornecedores ou atribuir licença sem decisão do usuário.
