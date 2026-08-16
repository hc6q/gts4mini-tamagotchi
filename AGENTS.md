# Regras obrigatórias do projeto

Este Mini Program roda no Amazfit GTS 4 Mini com Zepp OS 1.0. Armazenamento, RAM e tamanho do pacote são restrições críticas. Nunca trate o relógio como smartphone.

## Prioridade

1. Funcionalidade.
2. Estabilidade.
3. Baixo armazenamento.
4. Baixa RAM.
5. Aparência.

## Limites e documentação

- Consulte primeiro a documentação oficial do Zepp OS 1.0.
- Não invente limite máximo para ZAB, Mini Program ou `/data`.
- Se não houver limite oficial documentado, diga isso.
- Os números abaixo são metas internas, não limites oficiais:
  - save principal menor que 10 KB;
  - todo `/data` idealmente menor que 32 KB;
  - histórico menor que 10 KB;
  - assets idealmente menores que 1 MB.

## Assets e interface

- Prefira `FILL_RECT`, `STROKE_RECT`, `TEXT`, `BUTTON` e outros widgets.
- Não crie frames 336 × 384 para animações.
- Se uma imagem for necessária, recorte-a no tamanho exibido e reutilize-a.
- Use sprites de aproximadamente 48 × 48, 64 × 64 ou 80 × 80.
- Use 2 a 4 frames por estado e animação de 2 a 6 FPS.
- Não adicione áudio, vídeo, GIF, fontes grandes, fundos duplicados ou assets sem uso.
- Não adicione centenas de KB para uma melhoria visual sem buscar uma alternativa por código.

## Save e sensores

- Persista um único save pequeno.
- Use escrita segura somente com APIs reais do Zepp OS 1.0.
- Não armazene dados que possam ser recalculados.
- Nunca armazene histórico completo de passos, frequência cardíaca, sono ou clima.
- Frequência cardíaca: somente o último valor necessário.
- Sono: somente score e agregados diários necessários.
- Clima: no máximo o último tipo, se uma mecânica futura realmente precisar dele.
- Textos de eventos ficam no código, nunca repetidos no save.
- Eventos persistidos devem usar valores compactos, como `[t, e, v]`.
- Toda coleção persistente deve ter limite explícito.
- Diário: no máximo 15 eventos.
- Se permadeath for ativado, cemitério: no máximo 5 registros mínimos, nunca saves completos.

## Código

- Use JavaScript simples.
- Não adicione framework ou biblioteca de runtime quando poucas linhas resolvem.
- Código de ferramentas do PC não pode ser importado pelo app.
- Remova código morto, logs, páginas antigas, temporários, sprites substituídos e dependências sem uso antes de release.
- Preserve compatibilidade com Zepp OS 1.0 e com a tela 336 × 384.

## Build e entrega

- Execute testes antes do build.
- Use `npm run build` para gerar o ZAB e imprimir a auditoria.
- Execute `node tools/storage-report.cjs` depois de qualquer build feito por outro comando.
- Não finalize uma release sem o tamanho real do ZAB.
- O relatório final deve conter:
  - ZAB;
  - JavaScript;
  - assets;
  - `/data` esperado;
  - maior arquivo;
  - quantidade de sprites;
  - maiores assets.
- Se um arquivo ocupar uma parcela desproporcional, analise e otimize antes de adicionar funcionalidades.
