# Android Operator Studio

Um estúdio para uma pessoa e uma IA criarem, inspecionarem e executarem o
mesmo plano de operação Android. **Nome provisório**, até o trabalho de branding.

O primeiro consumidor é o **FNaF**. Seu trabalho sobre os quatro jogos fornece
transporte, aquisição nativa, relógios, execução limitada, supervisão e evidência
já exercitados em condições concretas. O estúdio torna essas capacidades
acessíveis por um contrato comum; as mecânicas e as estratégias continuam
pertencendo aos jogos.

[Escopo e plano consolidados](PROJECT.md) · [Anatomia do experimento Pokémon](docs/EXPERIMENT-POKEMON-20261005.md).

[Experimentos no aparelho: capacidades e limites no Pokémon](docs/EXPERIMENT-POKEMON-CAPABILITIES-20261005.md).
[Segunda rodada: captura, reconhecimento e fluxo físico de menu](docs/EXPERIMENT-POKEMON-ROUND2-20261005.md).

## Primeira entrega

- Editor de blocos com condições, prazos, saídas por resultado e loops limitados.
- Um schema versionado para UI, CLI e MCP; planos são salvos por SHA-256.
- Executor com observação fresca, precondição, confirmação do efeito,
  cancelamento e rastros retidos.
- Integração FNaF que usa o compilador e o runner **existentes** para a
  campanha Night 1 em dry-run, com relatório e manifest retidos.
- Captura Companion que chama o `native-frame.ts` **original** sob o
  `device-lock-exec.py` **original**, compartilhando o lease do FNaF.
- Snapshot ADB separado como diagnóstico independente, somente leitura.
- Gate de email reutilizado do FNaF: autor e committer GitHub noreply em
  `commit-msg`, `pre-push` e CI com histórico completo, sem exceções herdadas.

**Verificado:** fixture, integração MCP, interface no navegador, campanha FNaF
em dry-run e SNAP físico no Pokémon com gates do runtime via MCP. Veja os
[registros gerados](docs/evidence).
**Medido na segunda rodada:** comparação ADB/SNAP, reconhecimento por regiões
e o mesmo plano de menu/equipe/retorno executado no aparelho, partindo do mapa
e do menu aberto. Usa HID e leitor PNG originais do FNaF, em um adaptador de
pesquisa ligado ao executor comum. Home foi recusado com zero contatos.
**Aberto:** admissão desse adaptador pela UI/MCP, identidade de build/perfil,
qualificação entre sessões/alvos, detectores semânticos gerais e execução
temporal. O perfil da primeira rodada continua recusado para replay.

## Executar

Node >=22.18, npm e Git. O estúdio, a fixture, o MCP e a captura Companion usam
o pacote privado `@android-operator/device`, sem precisar de checkout do FNaF.
A integração opcional de campanha FNaF precisa desse checkout e suas dependências.

```sh
npm ci
npm run setup
git config user.email '<id>+<login>@users.noreply.github.com'
npm run verify
npm start
```

Abra **http://127.0.0.1:4310** e execute a fixture. Para a demonstração de campanha,
configure o arquivo local e ignorado `.operator/config.json`:

```json
{
  "schema": "operator-config/v1",
  "integrations": {"fnaf": {"checkout": "/caminho/para/fnaf2-1020"}}
}
```

```sh
npm run demo:fnaf
npm start
```

Para observação física, selecione o celular/Companion e use **Observar**.
O Companion precisa estar instalado e sua sessão de MediaProjection ativa.
Esta integração não instala APKs nem inicia consentimento automaticamente.
O APK instalado ainda usa a identidade histórica do Companion FNaF; a extração
do aplicativo Android é uma etapa futura. Se outro controlador usa o aparelho,
configure `device.leaseDirectory` no mesmo arquivo com o diretório de locks que
ele utiliza. Todos os consumidores precisam compartilhar o mesmo namespace;
o padrão independente fica em `~/.local/state/android-operator/locks`.

## MCP

`npm run build`, depois configure o cliente para iniciar `node /caminho/absoluto/dist/mcp.js`,
com `cwd` neste repositório. A configuração de campanha é opcional e local.
Não use `npm run mcp` como transporte stdio: o banner do npm pode interferir
no protocolo. O script é apenas um atalho de terminal.

Ferramentas: `devices_list`, `device_observe`, `fnaf_inspect`, `plan_validate`,
`plan_save`, `plan_load`, `run_start`, `run_status`, `run_cancel`.
`run_start` retorna um ID imediatamente; acompanhe e cancele pelo ID.
O mesmo hash de plano identifica o artefato em todas as interfaces.
Não há modelo de IA embutido: um agente externo usa o MCP para autoria/operação.

## Verificação e rastros

```sh
npm run verify
npx playwright install chromium
npm run test:browser
npm run test:identity
npm run test:fnaf # integração opcional previamente configurada
```

Para usar um Chrome local no teste de navegador, defina
`OPERATOR_BROWSER_EXECUTABLE` com o caminho do executável.
O CI verifica contratos, MCP, identidade e navegador. A integração FNaF é uma
verificação local explícita; o CI ainda não tem seu checkout como dependência.

Planos, runs e PNGs ficam em `.operator/`, ignorado pelo Git. Registros
derivados em `docs/evidence/` distinguem **FIXTURE**, **MODEL_ONLY** e
**DEVICE_MEASURED**. As imagens não são publicadas automaticamente.

## Direção

Começar por integração e medir antes de reconstruir. A decisão e os limites
estão em [Arquitetura](docs/ARCHITECTURE.md); o objetivo e os próximos passos,
em [Produto](docs/PRODUCT.md) e [Roadmap](docs/ROADMAP.md).
A pesquisa de origem e sua proveniência estão em [Research](docs/research/README.md).
