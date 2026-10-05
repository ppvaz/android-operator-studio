# Origem e limites

Mecanismos extraídos do projeto FNaF de Pedro. ORIGIN.json registra revisão,
seleções, hashes de origem e adaptações. Não foi atribuída uma licença nova.
Não contém mecânicas de jogo, nem depende de checkout ou node_modules do FNaF.
A extração conserva o protocolo do Companion instalado e o algoritmo de lease.
O identificador do APK e o nome de socket legado permanecem por compatibilidade.
Um APK independente e a adoção deste pacote pelo FNaF ainda são entregas futuras.

O lease usa um namespace de estado por host, configurável. Para interoperar com
um consumidor legado, ambos devem usar o mesmo diretório de locks; nunca criar
um lock privado e alegar exclusão entre projetos. Nesta migração, a configuração
local aponta para o namespace já usado no aparelho pelo FNaF. Nenhum toque é
qualificado só porque este pacote o transporta. Liberação, cancelamento e
qualificação do perfil pertencem à composição que usa os mecanismos.
