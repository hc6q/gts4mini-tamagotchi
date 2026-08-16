# Arquitetura de armazenamento

## Estado persistente

O aplicativo mantém um único objeto JSON em `/data/pet.dat`. As chaves são curtas porque o arquivo é escrito diretamente no relógio.

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
3. Escreve `pet.tmp`.
4. Lê e valida o conteúdo temporário.
5. Move o save anterior para `pet.bak`.
6. Promove `pet.tmp` para `pet.dat` com `hmFS.rename`.
7. Remove o backup depois do sucesso.
8. Em uma inicialização com save principal inválido, tenta o backup e o temporário.

O pico temporário esperado é três vezes o tamanho do save. No estado normal existe somente `pet.dat`.

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
| ZAB | 13,19 KB (13.506 B) |
| JavaScript-fonte do app | 19,71 KB (20.186 B) |
| Código compilado | 19,42 KB (19.890 B) |
| Assets no payload | 5,06 KB (5.184 B) |
| Assets-fonte | 199 B |
| Payload instalado | 25,23 KB (25.837 B) |
| Save estimado | 633 B |
| Pico temporário de escrita segura | 1,85 KB (1.899 B) |

Maior arquivo-fonte do app: `page/index.js`, 7,45 KB. Maior arquivo no payload: `page/index.bin`, 12,38 KB. Único asset: ícone obrigatório do app. Sprites de personagem: 0.
