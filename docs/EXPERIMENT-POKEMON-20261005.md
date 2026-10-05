# Anatomia do experimento Pokémon

Registro retrospectivo da sessão de 2026-10-05, feito enquanto o contexto
ainda estava disponível. Fonte: pedidos do operador, respostas e resultados
das ferramentas na conversa. Não houve protocolo pré-registrado, gravação
contínua ou run pack do novo runtime. O texto organiza uma experiência real;
não transforma a conversa em benchmark.

## O experimento que Pedro conduziu

Primeiro: “O celular está conectado me descreva o que há na tela”.
Depois: “Consegue atuar para me levar à porta ao ginásio de fogo?”.
Finalmente, Pedro apontou a pesquisa de Android/IA/estúdio visual e anunciou
um novo projeto. Ele explicitou que o desafio inicial havia sido uma
provocação para revelar a capacidade e o projeto que poderia nascer dela.

A primeira tarefa testava acesso e percepção. A segunda acrescentava um
objetivo sem caminho prescrito. Era necessário descobrir o estado inicial,
usar conhecimento de domínio, operar controles opacos e verificar o destino.
O critério solicitado era chegar à porta, não vencer o ginásio.

## Sequência observada

| Etapa | Observação / ação | O que permitiu decidir |
|---|---|---|
| Descoberta | ADB encontrou um Moto g56 5G autorizado | Havia um aparelho operável naquele momento |
| Primeira imagem | Jogo Pokémon em pixel art, personagem diante de uma casa; emulador com controles virtuais | Descrição visual direta; versão/cidade ainda não confirmadas |
| Contexto técnico | App foreground `com.fastemulator.gbc`; display físico 1080 × 2400; UIAutomator mostrou uma SurfaceView | O jogo não oferecia uma árvore semântica de menus/objetos ao operador |
| Acesso aos menus | Abriu-se o menu do emulador e voltou-se ao jogo; pulsos curtos de Start não abriram imediatamente o menu do jogo | Enviar o comando não bastava; era necessário observar o efeito |
| Adaptação do input | Um `input swipe` com início/fim no mesmo ponto e duração nominal de 150 ms abriu o menu | Um contato mantido funcionou naquele controle e estado; duração recebida pelo jogo não foi medida |
| Conhecimento do jogo | Menu de primeira geração com POKÉDEX, POKÉMON, ITEM e RED; equipe de níveis elevados | O save possuía recursos suficientes para investigar uma rota rápida |
| Descoberta da capacidade | Selecionou-se DUX, nível 49; seu menu ofereceu CUT e FLY | A navegação poderia usar Fly, evitando uma rota longa por água |
| Planejamento e execução | No mapa de Fly, selecionou-se Cinnabar Island; a animação e o cenário de chegada foram observados | A transição para o destino foi confirmada visualmente |
| Navegação local | Contornaram-se os prédios; novas capturas mostraram avanço até o prédio GYM | Movimentos curtos permitiram corrigir/alocar a posição seguinte |
| Condição terminal | Ao aproximar-se da porta, o jogo exibiu “The door is locked...” | O destino foi atingido; entrar exigia outra tarefa e a Secret Key |

A pesquisa web forneceu contexto de rota e da chave. A capacidade Fly foi
confirmada no próprio jogo. A localização e a sequência de botões não vieram
de um perfil previamente calibrado.

## O ciclo de decisão

```text
objetivo humano
  → observar pixels e contexto do aparelho
  → formular hipótese sobre estado/caminho
  → explorar uma capacidade do alvo
  → executar uma ação limitada
  → capturar novamente
  → confirmar ou corrigir
  → reconhecer a condição terminal
```

Não foi replay de uma macro pronta. Houve exploração de menus, identificação
de uma habilidade disponível e adaptação após inputs sem efeito observado.
Também não foi um controlador temporal: cada decisão dependia de um turno
do agente e de ferramentas host com esperas de centenas de milissegundos
ou segundos.

## O que o resultado demonstra

- O agente acessou um aparelho real, descreveu a tela e concluiu uma tarefa
  pontual de navegação mediante observação e ações autorizadas.
- Foi possível operar o conteúdo de um jogo cuja hierarquia Android era uma
  SurfaceView opaca, usando pixels e os controles visuais do emulador.
- A escolha de uma capacidade existente no save simplificou o plano.
- Uma mensagem terminal do próprio alvo sustentou a conclusão “chegou à porta”.

Esses são fatos da sessão. A ferramenta Android Operator Studio ainda não
existia quando as ações foram executadas. A experiência não pode ser
registrada como qualificação do seu executor ou do seu backend Companion.

## O que permaneceu UNKNOWN

Taxa de sucesso, repetibilidade em outro save/aparelho, duração efetivamente
recebida dos contatos, idade dos frames, latência evento→aceitação, deadlines,
efeito térmico e comportamento sob falhas. Não houve medição de cada parcela.
As coordenadas foram inferidas das imagens; não havia identidade de geometria
ou calibração retida. Um sucesso não demonstra robustez.

## Fragilidades do operador improvisado

Os itens abaixo descrevem **esta sessão Pokémon**, não um inventário de
capacidades ausentes no FNaF. O cruzamento com a implementação e a evidência
existentes está na seção seguinte.

1. **Toques rápidos sem efeito confirmado.** Houve repetição e mudança para
   contatos mantidos. A ferramenta deve representar duração e expectativa de
   efeito, conservando cada tentativa.
2. **Comandos de menu em sequência muito próxima.** Algumas mudanças esperadas
   não apareceram, e houve inserção de pausas. Um comando de navegação deve
   depender da leitura do menu/seleção atual ou de um timing qualificado.
3. **Capturas com tela em transição.** Algumas imagens chegaram durante
   fechamento de menu, animação ou texto ainda sendo escrito. O runtime
   precisa definir estabilidade, frescor e deadline de observação.
4. **Conhecimento misturado com percepção.** A identificação do mapa e a rota
   usaram conhecimento do agente. Uma automação reutilizável deve separar a
   hipótese estratégica das condições observáveis que a autorizam.
5. **Rastro frágil.** O PNG temporário foi sobrescrito a cada captura. Não houve
   pacote permanente de imagens e inputs que permitisse replay independente.
6. **Controle de dispositivo ad hoc.** Não foram usados lease exclusivo,
   perfil com hash ou o Companion. Esse método serviu ao desafio pontual, mas
   não deve virar a arquitetura de operação FNaF.
7. **Verificação final visual, feita pelo agente.** O jogo exibiu a condição
   terminal; ainda faltava um verificador independente dessa conversa.

## O que o FNaF já explorou

**Sim: os sete temas já têm tratamento no FNaF**, em graus e escopos
diferentes. Há código, ensaios físicos, resultados negativos e mecanismos de
verificação. Isso não significa que todos estejam resolvidos para qualquer
aplicativo Android. As referências abaixo fixam o checkout consultado em
`7604358518114a039faed78344b7da167e7b7fcb` do repositório `ppvaz/fnaf-solver`
(diretório local `fnaf2-1020`).

| Fragilidade vista no Pokémon | Tratamento existente no FNaF | O que cabe ao novo projeto |
|---|---|---|
| 1. Input enviado sem efeito confirmado | [Gate de aceitação](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/docs/device/accessibility-game-acceptance-20260906.json): callbacks Accessibility aceitos/concluídos sem transição; controle UHID produziu a transição. O backend Accessibility não foi promovido. | Preservar a distinção entre despacho e efeito; qualificar cada backend/alvo. |
| 2. Sequência e duração dos contatos | [Exploração por passos](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/bin/phone/explore-step.ts) oferece tap, double e hold limitados, liberação e SNAP; [scheduler HID](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/src/campaign/hid-schedule.ts) executa a programação temporal local. | Consumir esses mecanismos; tornar condições e contatos editáveis. Não transportar coordenadas/durações de FNaF para Pokémon por suposição. |
| 3. Frames em transição e timing desconhecido | [Instrumento de regiões sob trace](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/docs/evidence/companion16-region-under-trace-20261001.json), [RegionStream](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/bin/phone/night-kit.ts) e [mapa de relógio](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/docs/evidence/clock-map-20260905-moto-g56-helper.json). A medição de regiões no menu não qualifica uma noite nem a aceitação de input. | Expor timestamps, frescor, orçamento e UNKNOWN; estabilidade visual depende do alvo. |
| 4. Estratégia confundida com percepção | [Contrato de camadas](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/CLAUDE.md): Source possui mecânicas, Propose políticas, Play observação/execução e Review prova. [Busca de timing por contato](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/docs/evidence/phone-input-bracket-20260928.json) conserva limites da hipótese e mantém a divergência modelo/aparelho aberta. | Generalizar a separação para adaptadores e planos, sem embutir estratégia de um jogo no runtime comum. |
| 5. Rastro sobrescrito e não reproduzível | [Run packs](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/review/src/evidence-pack.ts) retêm resultados, eventos, manifestos, hashes e custódia; perdas da recuperação permanecem nomeadas. O explorador também registra cada passo e usa arquivos de captura distintos. | Consumir os formatos e tornar a evidência navegável por etapa; a conversa Pokémon não pode ganhar retroativamente a evidência que não reteve. |
| 6. Acesso ad hoc ao aparelho | [Lease exclusivo](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/src/safety/device-lock-exec.py), [vínculo de identidade ao perfil/preflight](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/src/campaign/venue.ts) e [cleanup em interrupção](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/play/src/campaign/campaign-signal.ts). | Preservar esses gates nos adaptadores. O bootstrap já usa o lease original na captura Companion. |
| 7. Conclusão dependente da conversa | O [packer e a promoção](https://github.com/ppvaz/fnaf-solver/blob/7604358518114a039faed78344b7da167e7b7fcb/packages/review/src/evidence-pack.ts) verificam resultado terminal, manifesto, winner commitado e atestação a partir dos registros. | Permitir revisão fora da sessão. Os verificadores FNaF são específicos do alvo; a porta do ginásio ainda precisa do seu próprio critério observável. |

O caso mais próximo do desafio é `explore-step.ts`: ele já representa a
operação “observe, toque/mantenha, observe novamente, registre”. A sessão
Pokémon fez uma versão improvisada desse ciclo sem aproveitar a ferramenta.
Seu CLI atual restringe geometria e operações de lançamento/parada aos alvos
FNaF; consumi-lo em Pokémon exige um adaptador explícito, não apenas trocar
o nome do jogo.

Há três estados que precisam permanecer separados: **existir no FNaF**,
**estar integrado ao Studio** e **estar qualificado em outro alvo**. Hoje o
Studio consome o compilador/runner em dry-run e o CLI de SNAP sob lease;
scheduler, exploração, regiões e run packs são fontes para as próximas
integrações, não funcionalidades já transplantadas. A captura física desse
adaptador ainda não foi verificada nesta sessão.

A contribuição nova concentra-se na autoria visual e por agente do mesmo
artefato, na conversão de exploração em plano reutilizável e na integração
de capacidades entre alvos. O experimento evidencia a utilidade de levar
essa infraestrutura para uma operação geral; não justifica reconstruí-la.

## O que isso pede ao produto

O primeiro pedido foi “veja”; o segundo, “alcance”. O produto precisa apoiar
ambos: exploração por agente e transformação da exploração em um plano que
uma pessoa possa inspecionar, repetir e depurar.

O artefato deve reter observação, hipótese, ação, duração, condição de entrada,
resultado esperado, saídas, limites e evidência. O executor deve distinguir
sucesso, contradição, timeout e ausência de informação. O plano precisa
continuar compreensível fora da sessão que o criou.

O FNaF acrescenta o que esta experiência não testou: contatos simultâneos,
reações com prazo, sensores nativos e supervisão local. Seus componentes
existentes são a base para essas capacidades. A camada de autoria não deve
substituir execução local por um turno de LLM a cada toque.

## Próxima reprodução útil

Registrar previamente o save/estado inicial e a condição “diante do ginásio
em Cinnabar”; capturar pela infraestrutura existente; salvar o plano comum;
executá-lo pela UI e pelo MCP; reter frames/contatos/tempos; mudar uma condição
inicial e verificar se a execução recupera de forma limitada ou para com
diagnóstico. Isso testará a transformação de operação episódica em capacidade
reutilizável. Não há execução desse protocolo registrada aqui.
