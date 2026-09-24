# Integração HTTP com Sinaliza

## Análise e decisão

O `AppModule` importa `ClassificationModule`, que registra a estratégia pelo token
`SECTOR_CLASSIFIER_STRATEGY`. O consumidor é `PreviewClassificationUseCase`.
O provider passa de `KeywordSectorClassifierStrategy` para `HttpSectorClassifierStrategy`.
A implementação antiga permanece disponível no código, mas não é usada como fallback.

HTTP mantém os dois projetos independentes, sem acoplar o build ESM da IA ao NestJS.
O backend envia apenas `{ "description": "..." }` para
`POST /classification/preview` no serviço da IA. A IA consulta
`GET /api/v1/sectors`, executa o modelo e retorna o UUID. O backend compara esse UUID
com os setores consultados em seu repositório e monta a resposta com o nome oficial.
A API externa mantém `{ automatic_sector, confidence }` dentro do envelope padrão.
A resposta interna inclui `sector_id` e `dataSource` para validação no backend.

A listagem de setores exige JWT no cookie `access_token` (não aceita Bearer) e usa o envelope `{ success, data: { items }, timestamp }`.
O provider aceita esse envelope e também o contrato simples `{ items }`.
Não há criação de exemplos, retreinamento, alteração do banco ou escrita em chamados.
Todos os campos de histórico de encaminhamento permanecem intactos.

## Configuração

Backend (`backend-sinaliza/api/.env`, não versionar credenciais):

```dotenv
AI_MODE=disabled
AI_SERVICE_URL=http://127.0.0.1:3001
AI_SERVICE_TOKEN=<segredo compartilhado com pelo menos 32 caracteres>
AI_TIMEOUT_MS=5000
```

Serviço IA (variáveis do processo; o comando não carrega `.env` automaticamente):

```dotenv
AI_MODE=disabled
AI_HOST=127.0.0.1
AI_PORT=3001
AI_SERVICE_TOKEN=<mesmo segredo do backend>
AI_MODEL_PATH=/caminho/absoluto/modelo.json
BACKEND_API_URL=http://127.0.0.1:3000/api/v1
BACKEND_API_TOKEN=<JWT válido do backend>
BACKEND_TIMEOUT_MS=3000
```

Use o valor do cookie `access_token` obtido no login existente como `BACKEND_API_TOKEN`; o provider o envia no header Cookie. O token `AI_SERVICE_TOKEN` continua sendo enviado como Bearer exclusivamente na chamada backend → IA. Ele precisa continuar válido;
expiração ou revogação interrompe a classificação. Não há renovação automática nem
novo mecanismo de conta de serviço nesta entrega. Nunca use o segredo da IA como JWT.
Entre hosts, configure HTTPS e acesso privado aos serviços. Em contêineres, configure
`AI_HOST=0.0.0.0` e URLs que resolvam entre os contêineres.

Execute `npm run build && npm run start:service` na IA e inicie o backend normalmente.
`AI_MODE=disabled` retorna 503 sem carregar modelo ou consultar setores na IA.
Para ativar com dados reais, configure **ambos** os processos com `AI_MODE=trained`
e um artefato com `metadata.dataSource=REAL`, cujos IDs correspondam aos UUIDs reais.
Não basta renomear o metadata de um modelo MOCK.
`AI_MODE=mock` serve apenas para desenvolvimento isolado com IDs compatíveis;
`NODE_ENV=production` proíbe esse modo. Não existe tradução de nomes MOCK para UUIDs reais.

## Falhas e validações

- Token ausente/incorreto na IA: 401.
- Corpo inválido, vazio, maior que 2.000 caracteres ou com campos extras: 400.
- Novo setor não presente no metadata: 409 `MODEL_SECTORS_INCOMPATIBLE`.
- IA desativada: 503 `CLASSIFICATION_DISABLED`.
- Timeout, falha de rede ou autenticação no backend de setores: 503.
- UUID desconhecido, origem incompatível ou confidence inválida: backend rejeita com 502.
- Artefato sem origem válida, MOCK em modo trained ou classes diferentes do metadata:
  inicialização da IA falha.

A confidence é uma pontuação de similaridade, não uma probabilidade calibrada.
O timeout do backend deve ser maior que o timeout da consulta de setores.
Os testes usam HTTP em loopback e artefatos temporários de teste; não utilizam banco,
credenciais reais nem alteram o dataset MOCK congelado. A validação de implantação
com PostgreSQL e JWT reais depende do ambiente configurado.

## Atualização: duas representações e execução sem banco

`AI_MODEL_TYPE=tfidf|minilm` seleciona o carregador, com `tfidf` como padrão. A seleção
não altera `AI_MODE`: MOCK continua proibido em produção e `trained` exige origem REAL.

`AI_SECTOR_SOURCE=backend` é o padrão e preserva o backend como fonte de verdade.
A opção `mock-file` é aceita exclusivamente em `AI_MODE=mock`, para demonstração isolada.
Ela consulta a configuração de setores MOCK em arquivo e não se conecta ao banco.

Com os artefatos de release, `npm run demo:http` inicia essa demonstração apenas em
127.0.0.1:3001 e `npm run request -- "descrição"` faz a requisição autenticada de teste.
O token padrão desse comando é público e exclusivo da demonstração local. Não é uma
credencial de produção. `NODE_ENV=production` bloqueia esse comando.
