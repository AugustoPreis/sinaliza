# IA Sinaliza — teste local para o ECC

A versão local inclui TI, Secretaria Acadêmica, Financeiro, Biblioteca e Infraestrutura.
O treinamento é sintético (MOCK). A sugestão de setor precisa de confirmação humana.
Para testar na mão, veja [TESTES-MANUAIS.md](TESTES-MANUAIS.md).

## Executar

Na pasta `academic-ticket-ai`, com Node.js 22 e npm:

```bash
npm ci
npm run check
npm run predict -- "Na sala de aula, bateram na régua de energia e caiu toda a energia da fileira."
```

O resultado esperado desse relato é `Infraestrutura`. Use `npm run predict` para digitar
outras descrições, uma por linha, e `/sair` para encerrar.
O comando usa `models/release/manifest.json` se existir; caso contrário, usa
`models/latest.json`. Para escolher outro artefato, passe `--model caminho/modelo.json`.

## Os dois testes de aceitação

```bash
npm run test:acceptance
```

1. API autenticada com o modelo salvo: verifica o hash do dataset, os cinco setores e
   uma descrição conhecida de cada setor. É uma verificação funcional.
2. API com o relato real de queda de energia: verifica o texto original e a versão resumida,
   a ausência desses textos no dataset e o retorno de Infraestrutura.

O segundo caso veio do usuário e não foi usado para treinar. Como já orientou o diagnóstico,
é uma regressão conhecida, não uma estimativa independente de acurácia. Outros exemplos
reais inéditos, rotulados por responsáveis pelos setores, ainda são necessários.

## HTTP local, sem banco

Terminal 1:

```bash
npm run demo:http
```

Terminal 2:

```bash
npm run request -- "Na sala de aula, bateram na régua de energia e caiu toda a energia da fileira."
```

A API escuta em `http://127.0.0.1:3001/classification/preview`, recebe
`{"description":"..."}` por POST e retorna `automatic_sector`, `sector_id`, `confidence`,
`model` e `dataSource`. A pontuação não é probabilidade calibrada de acerto.
O token público desses comandos serve somente para demonstração local. Não funciona com
`NODE_ENV=production`. Se a porta já estiver ocupada, use o serviço existente atualizado
ou encerre a instância anterior antes de abrir outra.

## Modelo e reprodução

O modelo atual combina TF-IDF por palavras com embeddings multilíngues locais.
A API mantém os campos existentes e acrescenta `requires_review`, `review_reason` e
`alternatives` para comunicar pouca evidência ou discordância. O campo `confidence`
continua sendo uma pontuação, não probabilidade calibrada. Não é Random Forest.

```bash
npm run demo:train:hybrid
npm run check:all
```

A seleção usa grupos de validação separados; o ajuste final inclui treino+validação,
sem grupos de teste. O relatório exato está indicado em `models/latest.json`.
No teste de 26 representantes de grupos, o modelo acertou 19 (73,08%); o anterior acertava
18 nos mesmos textos. Na validação usada para seleção, foram 22/25 (88%). Os resultados
são exploratórios em dados sintéticos, não prova de precisão perto de 100% em chamados reais.

A primeira execução em uma máquina nova baixa pesos públicos do modelo multilíngue;
os textos são processados localmente. Depois os pesos ficam em cache.
Para usar o modelo lexical anterior sem embeddings, passe `--model` com o caminho desse artefato.

Consulte `reports/aceitacao-ecc.md` para limites, revisão e evidências.
`demo:train:hybrid` atualiza o ponteiro e as cópias de demonstração; reinicie serviços já abertos
para carregar mudanças. Dataset e modelos históricos são preservados.

## Integração e pacote

```bash
npm run package:ai
```

O pacote fica em `deliverables/sinaliza-ia.zip`, com manifesto SHA256. Não contém os
CSV privados, tokens, dependências nem caches. Usa uma lista explícita de arquivos.

A integração normal consulta os setores do backend. Configure `AI_MODEL_TYPE=tfidf`,
`AI_MODEL_PATH`, `AI_MODE`, `AI_SERVICE_TOKEN`, `BACKEND_API_URL` e `BACKEND_API_TOKEN`.
`AI_MODE` é `disabled` por padrão; um modelo MOCK não pode ser ativado como produção.
`AI_SECTOR_SOURCE=mock-file` é permitido somente em modo MOCK.

O mapa `config/backend-demo-sector-map.json` inclui cinco UUIDs exclusivos de demonstração.
Nenhum setor foi cadastrado no banco por esta correção. Para integrar, os IDs devem corresponder
aos setores reais; consulte `reports/http-backend-integration.md`.
