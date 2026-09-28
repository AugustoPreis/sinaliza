# Contrato da classificação dinâmica

## Cliente → backend

`POST /api/v1/classification/preview`, com autenticação e proteção CSRF já existentes:

```json
{"description":"Descrição do problema"}
```

O backend consulta `SectorsRepository.findAll()` a cada chamada. O cliente não escolhe os candidatos.
Resposta no envelope padrão `success/data/timestamp`:

```json
{
  "success": true,
  "data": {
    "automatic_sector": null,
    "confidence": 0.12,
    "classification": {
      "schema_version": 1,
      "request_id": "uuid-da-execucao",
      "model": "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      "model_version": "2c4055b12046f11709e9df2c122e59ffbdc2f900",
      "method": "dynamic-semantic-cosine-v1",
      "data_source": "REAL",
      "score_type": "uncalibrated_score",
      "requires_review": true,
      "review_reason": "insufficient_context",
      "alternatives": [],
      "decision": {"minimum_score": 0.25, "minimum_margin": 0.20, "margin": 0.03}
    }
  },
  "timestamp": "data-da-resposta"
}
```

Exemplo ilustrativo. Com evidência suficiente, `automatic_sector` é `{id: UUID, name: nome oficial}`. `confidence` é similaridade cosseno truncada a [0,1], não probabilidade. `REAL` identifica candidatos fornecidos pelo cadastro real; não significa treino supervisionado em chamados reais. `insufficient_context` cobre texto curto ou score insuficiente; `close_scores` indica margem insuficiente.

## Backend → IA

`POST /classification/preview`, autenticado com `Authorization: Bearer AI_SERVICE_TOKEN`:

```json
{"description":"Descrição do problema","candidates":[{"id":"40000000-0000-4000-8000-000000000001","name":"Nome cadastrado","categories":["Categoria cadastrada"]}]}
```

A IA retorna `sector_id` (UUID ou null), `automatic_sector`, `confidence`, `dataSource`, `model` e `classification`. O backend valida origem, UUIDs e metadados; nomes apresentados vêm do banco. A IA não consulta mais a lista pública de setores nem mantém JWT de usuário nesse fluxo.

Limites: descrição de 1 a 2.000 caracteres, até 500 candidatos, 100 categorias por candidato e 255 caracteres por categoria/nome; corpo interno até 2 MiB. Descrição e textos dos setores são divididos em blocos de até 400 caracteres antes do encoder para reduzir truncamento. Esse limite é por caracteres, não por tokens; entradas atípicas ainda precisam de avaliação. Pesos do encoder ficam em memória, sem cache de catálogo. Catálogos acima desses limites exigem revisão operacional; não são silenciosamente truncados.

## Criação do chamado

`POST /api/v1/tickets` continua multipart. `confirmed_sector_id` é obrigatório. `automatic_sector_id` é opcional/nulo; em multipart, omita quando não houver sugestão (não envie a string "null").

Antes de persistir ou enviar fotos, o backend reclassifica a descrição usando o catálogo atual. Se o UUID enviado divergir do resultado (inclusive null vs UUID), responde 409 `STALE_CLASSIFICATION`: o cliente deve refazer preview e confirmação. O backend não confia no campo enviado pelo navegador. Isso acrescenta uma inferência e evita token/tabela adicionais. Se descrição/catálogo mudarem, vale a decisão atual do servidor.

Sem sugestão: automático nulo, confirmado e atual apontam para o setor escolhido; `requester_corrected=false`, sem evento AUTO_CLASSIFIED. O evento de confirmação com origem nula representa escolha manual. Reencaminhamentos preservam o automático e o confirmado originais.

## Falhas e configuração

Entrada inválida: 400. Sem setores: 422. Falha técnica/serviço desligado: 503; não vira abstenção. Inconsistência do resultado interno: 502. IA interna exige Bearer; ausente/inválido: 401. Corpo interno acima do limite: 413. O backend normaliza falhas internas não válidas como indisponibilidade.

Ambos os processos: `AI_MODE=dynamic` e segredo igual `AI_SERVICE_TOKEN` (mínimo 32 caracteres). Backend: `AI_SERVICE_URL`, `AI_TIMEOUT_MS=15000`. IA: `AI_HOST=127.0.0.1`, `AI_PORT=3001`, opcional `AI_EMBEDDINGS_CACHE_DIR`. O default é desativado. Não existem chamadas de inferência a provedores externos; pesos precisam existir localmente.
