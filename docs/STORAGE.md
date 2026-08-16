# Arquitetura de armazenamento

## Estado persistente

O aplicativo mantém um único objeto JSON em `/data/pet.dat`. As chaves são curtas porque o arquivo é escrito diretamente no relógio.

O JSON é convertido para `Uint16Array`, com dois bytes por caractere, seguindo o exemplo oficial de persistência do Zepp OS 1.0. Isso evita que a página do diário ou uma nova execução interpretem o save em um formato diferente.

Dados persistidos:

- versão do schema;
- nome, nascimento e última atualização;
- evolução e três necessidades;
- contadores de cuidado usados para evolução;
- passos atuais e maior total diário observado;
- último score de sono e agregados de dias bons ou baixos;
- última frequência cardíaca disponível;
- até 15 eventos compactos do diário.

Dados não persistidos:

- amostras por minuto;
- estágios completos de sono;
- histórico de frequência cardíaca;
- histórico de clima;
- frames ou estado da animação;
- textos completos do diário.

## Gravação segura

1. Serializa o objeto.
2. Recusa conteúdo acima da meta interna de 10 KB.
3. Remove um temporário antigo.
4. Abre cada arquivo com `O_RDWR | O_CREAT`, sem combinar `O_CREAT` e `O_TRUNC`.
5. Escreve e valida `pet.tmp`.
6. Escreve `pet.dat` diretamente com `hmFS.write`.
7. Lê e valida o save principal.
8. Mantém `pet.tmp` se a gravação principal falhar.
9. Remove temporário e backup antigo depois do sucesso.
10. Na inicialização, tenta temporário, principal e backup, nessa ordem.

O fluxo não depende mais de `hmFS.rename`. O pico conservador continua sendo três vezes o tamanho do save. No estado normal existe somente `pet.dat`.

Se uma operação falhar, a tela principal mostra `SAVE E##`. Códigos `11` a `16` indicam falha no temporário e `21` a `26` no save principal. O último dígito identifica tamanho, remoção, abertura, escrita, fechamento ou validação, nessa ordem.

## Auditoria

`tools/storage-report.cjs` não entra no Mini Program. Ele mede:

- tamanho do ZAB, quando presente;
- JavaScript-fonte e código compilado usado pelo app;
- assets no projeto e no payload instalado;
- save estimado;
- 20 maiores arquivos;
- tamanho por diretório;
- quantidade de PNGs e arquivos JavaScript.

Quando `unzip` está disponível no computador, o script abre o ZAB, o ZPK e o `device.zip` para medir o payload real. Ferramentas, testes e documentação não aparecem nesse payload.

As metas são conservadoras. A documentação oficial do Zepp OS 1.0 consultada não informa um teto para o ZAB ou para `/data`.

## Relatório do build 0.1.0

Build gerado com Zeus CLI 1.9.3 e produto intermediário removido por `zeus prune --ip`:

| Medida | Tamanho real |
|---|---:|
| ZAB | 12,92 KB (13.233 B) |
| JavaScript-fonte do app | 19,17 KB (19.635 B) |
| Código compilado | 18,72 KB (19.165 B) |
| Assets no payload | 5,06 KB (5.184 B) |
| Assets-fonte | 199 B |
| Payload instalado | 24,52 KB (25.112 B) |
| Save estimado | 1,24 KB (1.266 B) |
| Pico temporário de escrita segura | 3,71 KB (3.798 B) |

Maior arquivo-fonte do app: `page/index.js`, 7,20 KB. Maior arquivo no payload: `page/index.bin`, 11,84 KB. Único asset: ícone obrigatório do app. Sprites de personagem: 0.
