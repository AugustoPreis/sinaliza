# Contrato de classificação: mobile → backend → IA

O mobile envia apenas a descrição ao backend. O backend autentica o usuário, chama a IA
com o token de serviço e valida o setor retornado contra o banco. O terminal é só uma
interface de teste; frases como “Encaminhar para TI” não fazem parte do contrato HTTP.

## Requisição

Mobile → backend: `POST /api/v1/classification/preview` (prefixo padrão do backend).
Backend → IA: `POST /classification/preview`, com `Authorization: Bearer <token-do-serviço>`.

```json
{"description":"o projetorr da sala nao mostra a imagem do notebook pelo cabo HDMI"}
```

A descrição deve conter de 1 a 2.000 caracteres. Não são aceitos foto, setor escolhido
ou instruções de classificação adicionais no corpo da requisição à IA.

## Resposta

A IA retorna JSON. Exemplo ilustrativo com ID oficial; valores de modelo e pontuação
variam por execução. Uma resposta realmente capturada está em
`../reports/structured-api-example.json` (catálogo MOCK, IDs de demonstração).

```json
{
  "sector_id": "uuid-oficial-do-setor",
  "automatic_sector": {"id":"uuid-oficial-do-setor","name":"TI"},
  "confidence": 0.42,
  "model": "tfidf-multilingual-minilm-hybrid",
  "dataSource": "MOCK",
  "classification": {
    "schema_version": 1,
    "request_id": "e62c477d-1b11-4b4d-898d-1b18c7721e80",
    "model": "tfidf-multilingual-minilm-hybrid",
    "model_version": "versao-do-artefato",
    "method": "tfidf-semantic",
    "data_source": "MOCK",
    "score_type": "uncalibrated_score",
    "requires_review": true,
    "review_reason": "close_scores",
    "alternatives": [{"id":"uuid-oficial-do-setor","name":"TI","score":0.42}],
    "processing": {
      "normalization": "unicode-whitespace-lowercase-v1",
      "corrected_tokens": 1,
      "semantic_chunks": 1
    }
  }
}
```

O backend devolve `automatic_sector`, `confidence` e `classification` dentro do envelope
padrão `{ "success": true, "data": {...}, "timestamp": "..." }`. Campos legados extras
na resposta da IA não precisam ser consumidos pelo mobile.
Os DTOs de Swagger do backend descrevem os campos de `classification` e seus tipos.
Nomes das alternativas e do setor principal vêm do banco; não são copiados cegamente da IA.

## Como o mobile deve interpretar

- `data.automatic_sector.id` é o ID para apresentar como sugestão, não um nome a ser comparado.
- `data.classification.requires_review=true`: pedir confirmação do setor ou mais detalhes.
  A sugestão continua disponível; não tratá-la como encaminhamento seguro automático.
- `requires_review=false`: a heurística não sinalizou dúvida. Ainda não é garantia de acerto.
- `confidence` e os `score` das alternativas são pontuações não calibradas. Não exibir “42% de chance”.
- `review_reason`: `insufficient_context`, `model_disagreement`, `close_scores` ou `uncalibrated_model`.
  Sem revisão, o motivo é `null`.
- `request_id`, `model`, `model_version`, `method` e `data_source` identificam a decisão para diagnóstico.
  Não são uma explicação causal inventada nem texto de raciocínio interno.
- `processing` informa operações realmente executadas: normalização, quantidade de tokens corrigidos
  e blocos processados pelo encoder. Pode faltar em modelos antigos.
- `classification` pode faltar em serviços legados: o consumidor não deve interpretar sua ausência como certeza.

A prévia não cria chamado e não substitui o fluxo já existente de confirmação do setor.

## Textos complexos e erros

A inferência híbrida normaliza Unicode, caixa e espaços e usa correção ortográfica conservadora.
Corrige apenas sugestões inequívocas permitidas pelo vocabulário; não remove negações, siglas
como HDMI/PIX nem valores. Não promete corrigir toda palavra desconhecida.
Descrições longas são divididas em blocos de até 400 caracteres, incorporando também o fim
do texto ao embedding. O ramo lexical usa o texto inteiro dentro do limite de 2.000 caracteres.
O serviço prepara encoder e corretor antes de começar a aceitar requisições.

Testes sintéticos pela API cobrem: projetor com erro de digitação, mensalidade com letra duplicada,
Biblioteca e Secretaria sem acentos, ar-condicionado e relato longo com o defeito do projetor no fim.
O modelo continua de classe única: relatos vagos, contraditórios, com dois problemas ou fora dos
cinco setores podem exigir revisão. Passar esses exemplos não prova precisão geral de 100%.

## Erros e configuração

- IA: 400 descrição/corpo inválido; 401 token; 409 setores incompatíveis; 413 corpo excessivo;
  503 serviço desativado ou indisponível.
- Backend: rejeita origem inesperada, setor desconhecido e pontuações/metadados inválidos.
  O código `INVALID_CLASSIFICATION_DETAILS` é devolvido com HTTP 502; não ocorre fallback silencioso.
- Tokens de serviço ficam só no backend. O mobile usa a autenticação normal do Sinaliza.
- O modelo atual continua MOCK; as proteções que impedem seu uso como modelo REAL permanecem.
- O timeout padrão do backend foi ajustado para 15 segundos (`AI_TIMEOUT_MS`), pois uma chamada local medida levou 4,3 segundos. Ajuste à máquina; medições locais estão em
  `../reports/structured-api-evaluation.json`. São medições de desenvolvimento, não garantia de SLA.

## Verificar

Na IA: `npm run check:all` (65 testes passaram nesta revisão).
No backend: `npm run build` e `npm test -- --runInBand src/modules/classification`
(21 testes passaram, incluindo HTTP → estratégia → caso de uso → DTO).

Os testes usam serviços locais e repositório de setores simulado. Não são homologação do
mobile real, da autenticação em produção ou do banco PostgreSQL.

## Configuração dos serviços


Backend (`api/.env`, não versionar credenciais):

```dotenv
AI_MODE=disabled
AI_SERVICE_URL=http://127.0.0.1:3001
AI_SERVICE_TOKEN=<segredo compartilhado com pelo menos 32 caracteres>
AI_TIMEOUT_MS=15000
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

