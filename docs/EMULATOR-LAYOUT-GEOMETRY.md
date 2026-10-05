# Geometria pela configuração do emulador

Pedro propôs em 2026-10-05 ler o posicionamento configurável do My OldBoy em
vez de depender de pontos escolhidos na imagem. O ensaio Gold encontrou um
XML legível no aparelho e passou a usá-lo no controlador de pesquisa.
Essa admissão não habilita contatos nos backends públicos da UI/MCP.

## Fontes e transformação

1. A tela Android de Layouts mostrou `Default` com `checked=true`.
2. O diretório externo `Android/data/com.fastemulator.gbc/files/config/layout`
   continha somente `Default-1080x2285.xml`.
3. O arquivo declara os retângulos de vídeo, direcional, A, B, grupo Start,
   menu e fast forward. Não foi necessário editar o layout nem acessar
   preferências privadas; `run-as` foi recusado por ser um app não depurável.
4. A hierarquia Android identifica a SurfaceView do emulador pelos bounds
   `[0,115][1080,2400]`. O deslocamento `(0,115)` converte coordenadas locais
   do XML para coordenadas físicas.

Exemplo medido: A possui bounds locais `792,1728,980,1916`. Seu centro local
é `(886,1822)` e o centro físico é `(886,1937)`. O vídeo local
`0,312,1080,1284` corresponde à região física `0,427,1080,1399`.

O controlador lê o arquivo e uma nova hierarquia Android em cada operação,
registra hashes e deriva os pontos e o recorte. A imagem revisada fica vinculada
ao hash da geometria. Se arquivo, área ou conjunto de perfis divergir, uma
revisão antiga não autoriza contato; é necessário obter nova evidência.
Neste ensaio há um perfil ativo explicitamente confirmado. Seleção automática
entre vários perfis não está implementada: mudanças exigem nova vinculação.

## O que o arquivo não informa

Nesta build, `start` é um grupo contendo Select e Start. Usamos as metades
esquerda/direita, confirmadas pela imagem; Select foi exercitado ao trocar
Headbutt e Curse de posição, preservando os dois golpes. As posições cardinais
do direcional são interiores derivados de seu retângulo, também exercitados
durante a navegação. O XML fornece os bounds dos grupos, não subregiões
individualmente nomeadas ou prova de aceitação de um contato.

A transformação física → imagem Companion continua sendo uma calibração
separada: nesta sessão o retrato aparece reduzido e centralizado num buffer
de `2400×1080`. Ler o layout elimina os pontos e o recorte constantes do
roteiro; não qualifica automaticamente outra build, orientação ou transporte.

## Verificação e aplicação ao produto

Testes cobrem origem diferente da SurfaceView, alteração de posição do botão,
recorte derivado e recusa de controles ausentes, duplicados ou fora da área.
As alterações de layout desses testes são sintéticas; o layout do usuário
foi mantido intacto. Evidências físicas ficam em `.operator`, com XML,
transformações e instrumentos arquivados por operação.

Preferir uma fonte estruturada disponível no alvo para a geometria e usar a
imagem para qualificar a interpretação e observar o efeito. Se a fonte faltar,
declarar isso e usar calibração visual explícita. A semântica do widget pertence
ao adaptador do emulador; o transporte geral recebe pontos e limites.
