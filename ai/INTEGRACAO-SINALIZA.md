# Integração da IA com o Sinaliza Backend

> Documento técnico: como integrar o serviço de classificação automática da IA com o backend do Sinaliza.

## Visão Geral

A IA fornece um **serviço HTTP independente** que recebe uma descrição textual e retorna o setor sugerido. O backend Sinaliza chama este serviço para preencher automaticamente o campo `automatic_sector_id` quando uma nova solicitação é aberta.

```
┌─────────────────────┐
│  Frontend Sinaliza  │
│  (App + Portal)     │
└──────────┬──────────┘
           ↓ POST /tickets
┌─────────────────────┐
│   Backend Sinaliza  │
│   (NestJS/Spring)   │
└──────────┬──────────┘
           ↓ POST /classification/preview
┌─────────────────────┐
│   Serviço IA        │
│   (TypeScript/Node) │
└──────────┬──────────┘
           ↓
      Classificação
           ↓
┌─────────────────────────┐
│ Setor sugerido retornado│
└─────────────────────────┘
```

---

## 1. Instalação e Execução

### 1.1 Pré-requisitos

- Node.js 22 LTS ou superior
- npm 10 ou superior
- Conexão com o backend Sinaliza (em desenvolvimento pode ser `localhost`)

### 1.2 Instalação

```bash
cd academic-ticket-ai
npm ci
npm run build
```

### 1.3 Variáveis de Ambiente

Crie um arquivo `.env` (não commitar em produção):

```bash
# Modo de operação: "mock", "development" ou "production"
AI_RUNTIME_MODE=development

# Porta onde o serviço fica ouvindo
AI_HOST=127.0.0.1
AI_PORT=3001

# Token de autenticação (mínimo 32 caracteres)
# Compartilhado entre Backend Sinaliza e Serviço IA
AI_SERVICE_TOKEN=seu-token-super-secreto-com-mais-de-32-caracteres

# Tipo de modelo: "tfidf" ou "minilm"
# Recomendado: tfidf (mais rápido, menos uso de memória)
AI_MODEL_TYPE=tfidf

# Caminho para o model treinado
AI_MODEL_PATH=models/release/manifest.json

# Fonte dos setores: "mock-file" ou "backend"
# Para integração com Sinaliza: SEMPRE "backend"
AI_SECTOR_SOURCE=backend

# URL da API Sinaliza (sem /api/v1)
BACKEND_API_URL=http://localhost:3000

# Token de acesso ao Backend Sinaliza
BACKEND_API_TOKEN=seu-outro-token-secreto

# Timeout para chamadas ao Backend em milissegundos
BACKEND_TIMEOUT_MS=3000
```

### 1.4 Iniciar o Serviço

**Desenvolvimento:**
```bash
npm run dev:service
```

**Produção:**
```bash
npm run build
npm run start:service
```

Esperado na saída:
```
Serviço de classificação na porta 3001.
```

---

## 2. Contrato HTTP

### 2.1 Endpoint: POST /classification/preview

Classifica uma descrição e retorna o setor sugerido.

#### Autenticação

```
Authorization: Bearer <AI_SERVICE_TOKEN>
```

#### Request

```http
POST http://127.0.0.1:3001/classification/preview HTTP/1.1
Content-Type: application/json
Authorization: Bearer seu-token-super-secreto-com-mais-de-32-caracteres

{
  "description": "O projetor da sala 101 não está funcionando"
}
```

**Constraints:**
- `description`: obrigatória, string, mínimo 1 caractere, máximo 2000 caracteres
- Deve ser texto puro (sem HTML, markdown ou formatação)

#### Response — Sucesso (HTTP 200)

```json
{
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "confidence": 0.94,
  "model": "tfidf",
  "dataSource": "MOCK"
}
```

**Campos:**
- `automatic_sector.id`: ID do setor (conforme cadastrado no backend)
- `automatic_sector.name`: Nome do setor (preenchido pela IA)
- `confidence`: (opcional) número entre 0 e 1, indicando confiança do modelo
- `model`: tipo de modelo usado ("tfidf" ou "minilm")
- `dataSource`: origem do treinamento ("MOCK" ou "REAL")

#### Response — Erros

**400 Bad Request** — Descrição inválida:
```json
{
  "code": "INVALID_REQUEST"
}
```

**401 Unauthorized** — Token inválido ou ausente:
```json
{
  "code": "UNAUTHORIZED"
}
```

**409 Conflict** — Modelo não suporta setores cadastrados:
```json
{
  "code": "MODEL_SECTORS_INCOMPATIBLE"
}
```
> Significa: **Modelo precisa ser retrenado porque novos setores foram cadastrados no backend.**

**503 Service Unavailable** — Classificação indisponível:
```json
{
  "code": "CLASSIFICATION_UNAVAILABLE"
}
```
> Pode ocorrer se o modelo não foi carregado ou houver erro no processamento.

---

## 3. Integração no Backend Sinaliza

### 3.1 Quando Chamar

Quando um novo chamado é criado (`POST /tickets`), **antes de salvar** no banco:

```
Frontend → POST /tickets → Backend
                            ↓
                    valida dados
                            ↓
                    chama IA → POST /classification/preview
                            ↓
                    obtém automatic_sector_id
                            ↓
                    salva ticket com automatic_sector_id
```

### 3.2 Pseudo-código de Integração

```typescript
// No controller POST /tickets do Backend Sinaliza

async createTicket(body: CreateTicketRequest): Promise<TicketResponse> {
  // 1. Validar entrada
  const { description, location, confirmedSectorId } = body;
  if (!description?.trim()) throw new BadRequest('Descrição obrigatória');

  // 2. Chamar IA para classificação automática
  let automaticSectorId: string;
  try {
    const aiResponse = await this.classificationService.preview(description);
    automaticSectorId = aiResponse.automatic_sector.id;
  } catch (error) {
    // Se IA falhar, usar fallback (ex: setor padrão)
    console.error('Classificação falhou:', error);
    automaticSectorId = 'sec_suporte'; // setor padrão
  }

  // 3. Validar que automatic_sector_id existe na base
  const sector = await this.sectorRepository.findById(automaticSectorId);
  if (!sector) {
    throw new Conflict('Setor sugerido não encontrado no sistema');
  }

  // 4. Registrar se houve divergência
  const requesterCorrected = confirmedSectorId !== automaticSectorId;

  // 5. Salvar ticket
  const ticket = await this.ticketRepository.create({
    description,
    requesterCorredId: automaticSectorId,
    confirmedSectorId: confirmedSectorId || automaticSectorId,
    currentSectorId: confirmedSectorId || automaticSectorId,
    requesterCorrected,
    // ... outros campos
  });

  return this.formatTicketResponse(ticket);
}
```

### 3.3 Classe de Integração (TypeScript)

Exemplo de um serviço que o Backend Sinaliza pode usar:

```typescript
// classification-client.service.ts

import axios, { AxiosInstance } from 'axios';

interface ClassificationResponse {
  automatic_sector: {
    id: string;
    name: string;
  };
  confidence?: number;
  model: string;
  dataSource?: string;
}

export class ClassificationClientService {
  private axios: AxiosInstance;

  constructor(
    private readonly aiBaseUrl: string,
    private readonly aiServiceToken: string,
    private readonly timeoutMs: number = 5000,
  ) {
    this.axios = axios.create({
      baseURL: aiBaseUrl,
      timeout: timeoutMs,
      headers: {
        Authorization: `Bearer ${aiServiceToken}`,
      },
    });
  }

  async preview(description: string): Promise<ClassificationResponse> {
    try {
      const { data } = await this.axios.post<ClassificationResponse>(
        '/classification/preview',
        { description },
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new Error('Descrição inválida para classificação');
        }
        if (error.response?.status === 401) {
          throw new Error('Token de IA inválido ou expirado');
        }
        if (error.response?.status === 409) {
          throw new Error('Modelo precisa ser retrenado (novos setores)');
        }
        if (error.response?.status === 503) {
          throw new Error('Serviço de classificação indisponível');
        }
      }
      throw error;
    }
  }
}
```

---

## 4. Configuração para Produção

### 4.1 Segurança

- **Nunca** exponha `AI_SERVICE_TOKEN` no Git ou logs
- Use variáveis de ambiente secretas no seu CI/CD
- Altere `AI_SERVICE_TOKEN` em produção para um valor único e complexo
- Apenas a máquina do Backend Sinaliza deve ter acesso à IA
- Use HTTPS se a IA for acessada pela rede

### 4.2 Docker (Exemplo)

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY models ./models

EXPOSE 3001

CMD ["npm", "run", "start:service"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  sinaliza-ai:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      AI_RUNTIME_MODE: production
      AI_HOST: 0.0.0.0
      AI_PORT: 3001
      AI_MODEL_TYPE: tfidf
      AI_MODEL_PATH: models/release/manifest.json
      AI_SECTOR_SOURCE: backend
      BACKEND_API_URL: http://sinaliza-backend:3000
      BACKEND_API_TOKEN: ${BACKEND_API_TOKEN}
      AI_SERVICE_TOKEN: ${AI_SERVICE_TOKEN}
    ports:
      - "3001:3001"
    depends_on:
      - sinaliza-backend
```

### 4.3 Monitoramento

Recomendações:

- Logar tempo de resposta de cada classificação
- Monitorar taxa de erros (400, 401, 409, 503)
- Alertar se confiança cair abaixo de threshold
- Coletar métricas de correção (quando requester não é conforme automático)

---

## 5. Tratamento de Erros

### 5.1 IA Não Responde

Se o serviço de IA não responder no timeout, o Backend deve:

1. **Log**: registrar o erro
2. **Fallback**: usar um setor padrão (ex: `sec_suporte`)
3. **UX**: Não bloquear criação do chamado; usar classificação manual

```typescript
async createTicket(body: CreateTicketRequest): Promise<TicketResponse> {
  let automaticSectorId: string = 'sec_suporte'; // fallback

  try {
    const aiResponse = await this.classificationService.preview(
      body.description,
    );
    automaticSectorId = aiResponse.automatic_sector.id;
  } catch (error) {
    // Falhou, mas não bloqueia
    console.warn('Classificação falhou, usando fallback:', error.message);
  }

  // Continua normalmente...
}
```

### 5.2 Modelo Incompatível (HTTP 409)

Se a IA retornar `409 MODEL_SECTORS_INCOMPATIBLE`:

1. **Significado**: Novos setores foram cadastrados, mas o modelo não os conhece
2. **Ação**: Notificar administrador para retreinar a IA
3. **Interim**: Usar setor padrão ou força o solicitante escolher manualmente

```typescript
if (error.response?.status === 409) {
  console.error(
    'CRITICAL: Modelo incompatível com setores. Retreinamento necessário.',
  );
  // Alertar administrador, usar fallback
  automaticSectorId = 'sec_suporte';
}
```

### 5.3 Token Inválido (HTTP 401)

Se a IA retornar `401 UNAUTHORIZED`:

1. Verificar se `AI_SERVICE_TOKEN` está correto no Backend
2. Verificar se `AI_SERVICE_TOKEN` está correto no Serviço IA
3. Se diferentes, sincronizar
4. Considerar usar um sistema de tokens com expiração/renovação

---

## 6. Performance e Limites

### 6.1 Características

| Aspecto | Valor |
|---------|-------|
| Timeout recomendado | 5000ms |
| Max descrição | 2000 caracteres |
| Tempo resposta típico | 50-200ms (TF-IDF) ou 200-800ms (MiniLM) |
| Modelo TF-IDF | ~10MB, rápido, executa em CPU |
| Modelo MiniLM | ~50MB, mais lento, usa ONNX |

### 6.2 Recomendações

- **Desenvolvimento e teste**: use TF-IDF (`AI_MODEL_TYPE=tfidf`)
- **Produção com CPU limitada**: use TF-IDF
- **Produção com recursos**: considere MiniLM (melhor acurácia)
- **Throughput**: o serviço processa ~1000-2000 classificações/segundo em CPU moderna

---

## 7. Troubleshooting

### "CLASSIFICATION_DISABLED"

**Causa**: `AI_RUNTIME_MODE` é `disabled`.

**Solução**: 
```bash
AI_RUNTIME_MODE=development npm run dev:service
```

### "INVALID_REQUEST"

**Causa**: Campo `description` vazio, muito longo ou ausente.

**Solução**: Validar que a descrição tem 1-2000 caracteres no Backend antes de chamar IA.

### "UNAUTHORIZED"

**Causa**: Token incorreto ou ausente.

**Solução**: Verificar se `AI_SERVICE_TOKEN` no Backend = `AI_SERVICE_TOKEN` no Serviço IA.

### "MODEL_SECTORS_INCOMPATIBLE"

**Causa**: Novos setores cadastrados no Backend, mas modelo treinado não os conhece.

**Solução**: Retreinar a IA com os novos setores.

```bash
# Com dados mock
npm run dataset:generate:mock
npm run train:tfidf
npm run train:minilm

# Depois reiniciar o serviço
```

---

## 8. Exemplo Completo: Fluxo de Criação de Ticket

### Frontend (App Sinaliza)

```
1. Usuário escreve: "O projetor da sala 101 não funciona"
2. Seleciona prédio: "Bloco A"
3. Seleciona ambiente: "Sala 101"
4. Clica "Criar Chamado"
```

### Backend Sinaliza

```javascript
// POST /api/v1/tickets
{
  "description": "O projetor da sala 101 não funciona",
  "location": {
    "building_id": "bld_01",
    "environment_id": "env_101"
  },
  "imageCount": 1 // opcionalmente fotos
}

↓ (interno)

// Chamar IA
POST http://ai-service:3001/classification/preview
Authorization: Bearer token-secreto
{
  "description": "O projetor da sala 101 não funciona"
}

↓ (resposta IA)

{
  "automatic_sector": {
    "id": "sec_ti",
    "name": "TI"
  },
  "confidence": 0.91,
  "model": "tfidf"
}

↓ (salvar no BD)

INSERT INTO tickets (
  description,
  automatic_sector_id,
  confirmed_sector_id,
  current_sector_id,
  requester_corrected,
  status
) VALUES (
  'O projetor da sala 101 não funciona',
  'sec_ti',
  'sec_ti',
  'sec_ti',
  false,
  'FORWARDED'
)

↓ (resposta ao frontend)

HTTP 201
{
  "id": "tkt_123",
  "protocol": "SIN-1042",
  "status": "FORWARDED",
  "automatic_sector": { "id": "sec_ti", "name": "TI" },
  "confirmed_sector": { "id": "sec_ti", "name": "TI" },
  "current_sector": { "id": "sec_ti", "name": "TI" },
  "created_at": "2026-09-23T10:30:00Z"
}
```

---

## 9. Contato e Suporte

Para dúvidas sobre integração:

1. Consultar [ENTREGA-IA.md](ENTREGA-IA.md) para detalhes do modelo
2. Rodar `npm run test` para validar testes locais
3. Rodar `npm run demo:http` para demonstração interativa

---

**Versão**: 1.0  
**Data**: 23 de setembro de 2026  
**Status**: Pronto para integração
