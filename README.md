# GTS Gotchi

Tamagotchi compacto para o Amazfit GTS 4 Mini. O Mini Program foi projetado para Zepp OS 1.0 e para a tela 336 × 384 do relógio.

## O que já funciona

- Ovo, bebê, criança, jovem e cinco evoluções adultas.
- Fome, humor, energia, alimentação, brincadeira e sono.
- Evolução calculada pelo tempo e pelos cuidados.
- Passos atuais, último valor de frequência cardíaca e último score de sono.
- Diário numérico limitado a 15 eventos.
- Save único e compacto em `/data/pet.dat`.
- Gravação verificada com arquivo temporário, recuperação e escrita direta do save principal.
- Abertura compatível com Zepp OS 1.0, sem combinar `O_CREAT` e `O_TRUNC`.
- Interface de terminal com rostos de texto compactos, medidores e separadores em ASCII.
- Barra de status oculta e controles sem grandes blocos preenchidos.
- Um único PNG de 64 × 64 para o ícone obrigatório do aplicativo.
- Zero sprites de personagem, áudio, vídeo, GIF, fonte customizada ou dependência de runtime.

O aplicativo não guarda históricos completos dos sensores. Ele salva somente os agregados usados pelas mecânicas.

## Compatibilidade

O alvo contém os dois `deviceSource` oficiais do GTS 4 Mini:

- `246`: variante chinesa.
- `247`: variante global.

O `appId` atual, `20000`, é apenas um identificador de desenvolvimento. Troque pelo ID atribuído no console da Zepp antes de publicar na loja.

## Build

Requisitos:

- Node.js 20 ou mais recente. Node.js 22 LTS é recomendado.
- Zeus CLI instalado globalmente.

No Linux, use NVM para instalar o Node no seu usuário. Isso evita erros de permissão em `/usr/local`:

```bash
nvm install
nvm use
npm install -g @zeppos/zeus-cli
```

```bash
npm install -g @zeppos/zeus-cli
npm test
npm run build
```

`npm run build` gera o ZAB, remove o produto intermediário com `zeus prune --ip` e executa automaticamente o relatório de armazenamento. O pacote final fica em `dist/`.

Para executar somente a auditoria:

```bash
npm run storage-report
```

## Persistência

O save usa chaves curtas. Um evento do diário ocupa três números:

```js
[timestamp, eventType, value]
```

Os textos ficam no código e são montados somente na interface. O pior caso atual estimado do save ocupa 1,24 KB no formato `Uint16Array` usado pelo Zepp OS 1.0. Durante uma gravação podem coexistir temporariamente `pet.dat` e `pet.tmp`. Um `pet.bak` antigo ainda pode ser lido para recuperação.

Quando a persistência falha, a tela mostra `SAVE E##` para identificar a etapa exata no relógio físico.

Permadeath não está ativo nesta versão. Por isso não existe cemitério ou estrutura persistente sem uso.

## Metas internas

Estes valores são metas conservadoras do projeto. Não são limites oficiais do hardware:

- Save principal abaixo de 10 KB.
- Todo o conteúdo de `/data` idealmente abaixo de 32 KB.
- Histórico abaixo de 10 KB.
- Assets idealmente abaixo de 1 MB.
- ZAB e JavaScript tão pequenos quanto a estabilidade permitir.

A documentação oficial consultada não publica um limite máximo para o ZAB nem para `/data` no Zepp OS 1.0. Não trate essas metas como especificações do relógio.

## Fontes oficiais

- [Dispositivos Zepp OS: GTS 4 Mini, tela e deviceSource](https://docs.zepp.com/docs/1.0/reference/related-resources/device-list/)
- [Persistência de dados com hmFS](https://docs.zepp.com/docs/1.0/guides/best-practice/persistence-storage/)
- [hmFS.write no Zepp OS 1.0](https://docs.zepp.com/docs/1.0/reference/device-app-api/hmFS/write/)
- [Zeus CLI e geração do ZAB](https://docs.zepp.com/docs/1.0/guides/tools/cli/)

## Limitações da versão 0.1

- Ainda precisa de teste no GTS 4 Mini físico.
- Não tem edição do nome do pet.
- Não tem clima, permadeath ou cemitério.
- O diário mostra os 7 eventos mais recentes, embora retenha até 15.
