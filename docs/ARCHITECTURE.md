# Integração primeiro

Decisão de 2026-10-05: desenvolver uma camada de integração com semântica
própria para planos, execução e diagnóstico. Reimplementar uma capacidade
somente quando um ensaio reproduzível mostrar que o backend existente
impede o comportamento necessário.

Pedro determinou que a infraestrutura de interação com celular do FNaF é a
fonte prioritária e que ele será o primeiro consumidor demonstrado. Esta
decisão substitui a hipótese inicial de começar por infraestrutura genérica
nova. A primeira integração consome CLIs e leases existentes, sem mover o
código de origem nem alterar calibragens de jogos.

```text
Pessoa / editor ─┐
                ├─ operator-plan/v1 ─ executor ─ Target port ─ backends
Agente / MCP ────┘                       │                       │
                                    run + evidência        FNaF existente
                                                          outras integrações
```

## O que é próprio

Plano compartilhado, validação, identidade, controle do fluxo, condições,
budgets, cancelamento e rastro por etapa. O plano não recebe shell arbitrário.
A rotina FNaF inicial tem um nome fechado e chama comandos fixos em dry-run.
O backend escolhido faz parte da identidade da execução, separadamente do plano.

Os quatro resultados operacionais são PASS, FAIL, TIMEOUT e UNKNOWN;
cancelamento encerra a execução. Uma condição lê uma observação fresca.
Um contato na fixture só passa após a observação da sua pós-condição.
Uma observação ausente nunca vira FAIL ou PASS por conveniência.

## O que é consumido hoje

| Capacidade | Origem | Forma de integração | Limite atual |
|---|---|---|---|
| SNAP nativo | FNaF `packages/play/bin/phone/native-frame.ts` | Subprocesso do CLI original | Exercitado no Pokémon; geometria e estabilidade entre alvos abertas |
| Lease do aparelho | FNaF `packages/play/src/safety/device-lock-exec.py` | Wrapper original, mesma raiz de locks | Não há segunda implementação do lock |
| Compilação de Night 1 | FNaF `packages/propose/bin/plans/emit.ts` | Comando fixo, winner canônico existente | Night 1 inicial; sem copiar estratégia |
| Gates da campanha | FNaF `apps/desktop/src/device-cli.ts` | `campaign --dry-run --json` | Resultado MODEL_ONLY, não vitória física |
| Gate de email | FNaF `tools/commit-identity.ts` | Cópia rastreada sob MIT | Mesma regra; nenhuma exceção histórica no novo repo |
| Protocolo MCP | SDK oficial TypeScript | Biblioteca publicada | Não reimplementar o protocolo |

O uso do Python no lease é consumo de uma interface existente. Não introduz
uma nova camada de scripts de dispositivo paralela.

## Próximos backends

A pesquisa documenta [scrcpy](https://github.com/Genymobile/scrcpy) para
espelhamento/controle, [Maestro](https://github.com/mobile-dev-inc/Maestro)
para automação semântica e [Airtest](https://github.com/AirtestProject/Airtest)
para aplicações e jogos por imagem. São candidatos; nenhum foi conectado ou
qualificado por este bootstrap. O SDK [MCP](https://github.com/modelcontextprotocol/typescript-sdk)
é a biblioteca já utilizada.

MAS e Melaya são comparadores de produto. Integração com suas plataformas
precisa considerar distribuição, acesso ao runtime, contratos e dependência
de serviço. A [validação do agente MAS](https://www.automationmacro.com/docs/agent)
não garante por si só supervisão equivalente em cada repetição de runtime.
Essas limitações tornam necessária a qualificação do contrato de cada backend.

## Limites explícitos

- O executor host deste bootstrap não promete deadlines de tempo real.
  Os budgets interrompem etapas assíncronas; não certificam o scheduler Android.
- Um backend deve respeitar AbortSignal e limitar seus subprocessos. Cancelar
  a espera não desfaz efeitos já aceitos por outra aplicação.
- `receivedAtMs` é recepção no relógio monotônico do host. `deviceImageNs` e
  `deviceSnapshotNs` permanecem no domínio do Companion. Sem clock map, não
  subtrair esses relógios para anunciar latência.
- Captura e pacote foreground no ADB são testemunhos sequenciais, não atômicos.
- Rotinas temporais FNaF continuam nos executores locais já existentes. Não
  converter noites para um loop de chamadas host/LLM por toque.
- A integração ainda referencia um checkout. Publicar um pacote reutilizável
  ou trocar a direção da dependência requer caracterizar contratos e comparar
  traces antes de alterar consumidores existentes.
- Os [experimentos Pokémon](EXPERIMENT-POKEMON-CAPABILITIES-20261005.md)
  mostraram que resolução, foreground e PNG válido não identificam geometria
  estável de contato. O buffer Companion pode conter um viewport retrato
  reduzido; essa transformação precisa de contrato e qualificação.
