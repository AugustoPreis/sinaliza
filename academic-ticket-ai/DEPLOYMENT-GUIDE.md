# 🚀 Guia de Deployment — IA Sinaliza

> Documento prático para o ECC: como colocar a IA em produção e integrar com o Backend Sinaliza.

---

## 1. Pré-requisitos

- ✅ Node.js 22 LTS (verificar: `node --version`)
- ✅ npm 10+ (verificar: `npm --version`)
- ✅ Acesso ao repositório: `/home/willian/Área de trabalho/aulas-satc/academic-ticket-ai`
- ✅ Backend Sinaliza já rodando ou planejado

---

## 2. Instalação Rápida

### 2.1 Preparar o Projeto

```bash
cd /home/willian/Área de trabalho/aulas-satc/academic-ticket-ai

# Instalar dependências
npm ci

# Compilar TypeScript
npm run build

# Validar que tudo está OK
npm test
```

Esperado:
```
✓ All tests passed
```

---

## 3. Configuração para Desenvolvimento

### 3.1 Criar `.env.local` (não commitar)

```bash
# DESENVOLVIMENTO
AI_MODE=mock
AI_SERVICE_TOKEN=seu-token-teste-com-minimo-32-caracteres
AI_MODEL_TYPE=tfidf
AI_MODEL_PATH=models/release/manifest.json
AI_SECTOR_SOURCE=mock-file

# Se tiver Backend rodando localmente:
# BACKEND_API_URL=http://localhost:3000
# BACKEND_API_TOKEN=seu-token-backend
```

### 3.2 Iniciar o Serviço em Desenvolvimento

```bash
npm run dev:service
```

Esperado:
```
Serviço de classificação na porta 3001.
```

### 3.3 Testar (outro terminal)

```bash
npm run request -- "Não consigo acessar o portal"
```

Esperado:
```json
{
  "sector_id": "TI",
  "automatic_sector": { "id": "TI", "name": "TI" },
  "confidence": 0.92,
  "model": "tfidf"
}
```

---

## 4. Integração com Backend Sinaliza (Desenvolvimento)

### 4.1 Assumindo que Backend roda em `http://localhost:3000`

Editar `.env.local`:

```bash
AI_MODE=mock
AI_SERVICE_TOKEN=seu-token-secreto-32-chars
AI_MODEL_TYPE=tfidf
AI_MODEL_PATH=models/release/manifest.json
AI_SECTOR_SOURCE=backend
BACKEND_API_URL=http://localhost:3000
BACKEND_API_TOKEN=seu-token-backend-secreto
BACKEND_TIMEOUT_MS=3000
```

### 4.2 Iniciar IA

```bash
npm run dev:service
```

### 4.3 No Backend Sinaliza

Quando criar novo chamado (`POST /api/v1/tickets`), chamar:

```typescript
const aiResponse = await fetch('http://127.0.0.1:3001/classification/preview', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer seu-token-secreto-32-chars',
  },
  body: JSON.stringify({
    description: body.description, // texto do chamado
  }),
});

const { automatic_sector } = await aiResponse.json();
const automaticSectorId = automatic_sector.id;

// Salvar no banco:
// ticket.automatic_sector_id = automaticSectorId;
// ticket.confirmed_sector_id = user.confirmed_sector_id || automaticSectorId;
```

---

## 5. Deployment em Produção

### 5.1 Preparar o Servidor

```bash
# No servidor de produção:
cd /srv/sinaliza-ai # ou outro local
git clone <repo> .
npm ci --only=production
npm run build
```

### 5.2 Criar `.env` (SECRET - não commitar)

```bash
# PRODUÇÃO
NODE_ENV=production
AI_MODE=trained
AI_SERVICE_TOKEN=gerar-novo-com-openssl-rand-base64-32
AI_MODEL_TYPE=tfidf
AI_MODEL_PATH=models/release/manifest.json
AI_SECTOR_SOURCE=backend

BACKEND_API_URL=https://sinaliza.instituicao.edu.br
BACKEND_API_TOKEN=seu-token-de-produção-seguro
BACKEND_TIMEOUT_MS=5000

AI_HOST=0.0.0.0
AI_PORT=3001
```

**Gerar token seguro:**
```bash
openssl rand -base64 32
```

### 5.3 Com Docker (Recomendado)

Criar `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY models ./models
COPY config ./config

EXPOSE 3001

ENV NODE_ENV=production
CMD ["npm", "run", "start:service"]
```

Build:
```bash
docker build -t sinaliza-ai:latest .
```

Run:
```bash
docker run -d \
  --name sinaliza-ai \
  -p 3001:3001 \
  -e AI_MODE=trained \
  -e AI_SERVICE_TOKEN="seu-token-32-chars" \
  -e BACKEND_API_URL="https://sinaliza.instituicao.edu.br" \
  -e BACKEND_API_TOKEN="seu-token" \
  sinaliza-ai:latest
```

### 5.4 Com Docker Compose (Mais simples)

Criar `docker-compose.yml`:

```yaml
version: '3.8'

services:
  sinaliza-ai:
    image: sinaliza-ai:latest
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      AI_MODE: trained
      AI_SERVICE_TOKEN: ${AI_SERVICE_TOKEN}
      AI_MODEL_TYPE: tfidf
      AI_MODEL_PATH: models/release/manifest.json
      AI_SECTOR_SOURCE: backend
      BACKEND_API_URL: ${BACKEND_API_URL}
      BACKEND_API_TOKEN: ${BACKEND_API_TOKEN}
      BACKEND_TIMEOUT_MS: "5000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/classification/preview || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

Criar `.env.production`:
```bash
AI_SERVICE_TOKEN=seu-token-32-chars
BACKEND_API_URL=https://sinaliza.instituicao.edu.br
BACKEND_API_TOKEN=seu-token-backend
```

Deployar:
```bash
docker-compose up -d
```

---

## 6. Monitoramento e Troubleshooting

### 6.1 Verificar Status

```bash
# IA respondendo?
curl -X POST http://localhost:3001/classification/preview \
  -H "Authorization: Bearer seu-token" \
  -H "Content-Type: application/json" \
  -d '{"description":"teste"}'
```

Esperado:
```json
{
  "sector_id": "TI",
  ...
}
```

### 6.2 Logs

```bash
# Se rodando no terminal:
# Logs aparecem direto

# Se rodando com systemd:
sudo journalctl -u sinaliza-ai -f

# Se rodando com Docker:
docker logs -f sinaliza-ai
```

### 6.3 Erros Comuns

#### HTTP 401 — UNAUTHORIZED
- Verificar se `AI_SERVICE_TOKEN` é idêntico no Backend e IA
- Token precisa ter **mínimo 32 caracteres**

#### HTTP 409 — MODEL_SECTORS_INCOMPATIBLE
- **Significado**: Novos setores foram cadastrados no Backend
- **Solução**: Retreinar modelo com os novos setores
- Backend deve ter fallback para este erro

#### HTTP 503 — CLASSIFICATION_UNAVAILABLE
- Modelo não foi carregado
- Verificar se `AI_MODEL_PATH` aponta para arquivo válido
- Verificar permissões de arquivo

#### Timeout ao Backend
- Aumentar `BACKEND_TIMEOUT_MS` se Backend é lento
- Verificar conectividade entre IA e Backend
- Validar `BACKEND_API_URL` e `BACKEND_API_TOKEN`

---

## 7. Performance e Otimizações

### 7.1 Escolher Modelo

| Aspecto | TF-IDF | MiniLM |
|---------|--------|--------|
| Velocidade | ⚡⚡⚡ Rápido | ⚡⚡ Moderado |
| Memória | ~10MB | ~50MB |
| Acurácia | 📊 Boa | 📊📊 Melhor |
| CPU/GPU | CPU | CPU+ONNX |
| Recomendado | ✅ Produção padrão | Quando acurácia é crítica |

**Padrão (recomendado para produção):**
```bash
AI_MODEL_TYPE=tfidf
```

**Alternativa com melhor acurácia:**
```bash
AI_MODEL_TYPE=minilm
```

### 7.2 Escalabilidade

Uma instância da IA processará ~1000-2000 classificações/segundo em CPU moderna.

Se precisar mais throughput:

1. **Horizontal**: Rodar múltiplas instâncias atrás de load balancer
2. **Nginx reverse proxy:**

```nginx
upstream sinaliza_ai {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 3000;
    location / {
        proxy_pass http://sinaliza_ai;
    }
}
```

---

## 8. Integração Backend Sinaliza — Checklist

- [ ] IA respondendo em `http://backend-host:3001/classification/preview`
- [ ] Token `AI_SERVICE_TOKEN` sincronizado entre IA e Backend
- [ ] Backend pode chamar IA sem timeout
- [ ] Erro HTTP 401 trata token inválido
- [ ] Erro HTTP 409 dispara alertas (modelo precisa retrainamento)
- [ ] Erro HTTP 503 usa fallback (setor padrão)
- [ ] Campo `automatic_sector_id` sendo salvo no banco
- [ ] Campo `requester_corrected` registrando divergências
- [ ] Indicadores de pesquisa coletando dados certos

---

## 9. Retreinamento de Modelo (Quando Necessário)

Se novos setores forem cadastrados ou houver muitos dados reais acumulados:

### 9.1 Com dados mock (teste):
```bash
npm run dataset:generate:mock
npm run train:tfidf
npm run train:minilm
```

### 9.2 Com dados reais:
```bash
DATASET_PATH=data/private/chamados-reais.csv npm run train:tfidf
DATASET_PATH=data/private/chamados-reais.csv npm run train:minilm
```

### 9.3 Publicar novo modelo:
```bash
npm run release:prepare
# Modelo salvo em models/release/manifest.json
```

### 9.4 Reiniciar IA:
```bash
# Se em container:
docker-compose restart sinaliza-ai

# Se systemd:
sudo systemctl restart sinaliza-ai

# Se terminal:
Ctrl+C e npm run dev:service
```

---

## 10. Arquivos Críticos

| Arquivo | Propósito | Commitar? |
|---------|-----------|-----------|
| `src/http/server.ts` | Servidor HTTP | ✅ Sim |
| `src/classification/` | Lógica de classificação | ✅ Sim |
| `models/release/manifest.json` | Modelo treinado | ✅ Sim (release) |
| `.env` | Configuração de produção | ❌ Não (secret) |
| `.env.local` | Configuração local | ❌ Não |
| `node_modules/` | Dependências | ❌ Não |
| `dist/` | JavaScript compilado | ❌ Não (build) |

---

## 11. Segurança

### 11.1 Token de Serviço

- ✅ Gerar com `openssl rand -base64 32`
- ✅ Mínimo 32 caracteres
- ✅ Armazenar em `.env` ou variables secretas do CI/CD
- ✅ NUNCA commitar em Git
- ✅ Rotacionar periodicamente em produção

### 11.2 Rede

- ✅ IA deve estar APENAS acessível do Backend (não internet)
- ✅ Usar firewall para bloquear acesso público
- ✅ Se expor para rede: usar HTTPS e limitador de taxa

### 11.3 Backend API Token

- ✅ Token do Backend Sinaliza também secreto
- ✅ Revisar permissões (IA precisa apenas: GET `/sectors`)

---

## 12. Rollback de Emergência

Se algo der errado em produção:

```bash
# Parar IA
docker-compose down

# Voltar para versão anterior em Git
git checkout v1.0.0
npm run build

# Redeploy com modelo antigo
docker-compose up -d
```

---

## 13. Documentação para o Sinaliza Backend

Passar este arquivo para o time de Backend:

→ [INTEGRACAO-SINALIZA.md](INTEGRACAO-SINALIZA.md)

Ele contém:
- Contrato HTTP exato
- Exemplos de integração
- Tratamento de erros
- Formato de resposta

---

## FAQ — Perguntas Frequentes

### "Como faço para retreinar com dados reais?"

1. Exportar chamados da instituição (anonimizar antes!)
2. Salvar em `data/private/chamados-reais.csv`
3. Executar `DATASET_PATH=data/private/chamados-reais.csv npm run train:tfidf`
4. Publicar: `npm run release:prepare`
5. Redeployar a IA

### "A IA está lenta, o que fazer?"

1. Verificar se modelo é TF-IDF (mais rápido) ou MiniLM (mais lento)
2. Verificar CPU/memória do servidor
3. Se muitos requests: rodar múltiplas instâncias com load balancer

### "Como atualizar o token em produção?"

1. Gerar novo: `openssl rand -base64 32`
2. Atualizar em `.env` (IA)
3. Atualizar em Backend Sinaliza (variável ambiente)
4. Reiniciar ambos: `docker-compose restart`

### "Model precisa ser retrenado quando?"

- Depois de 1000+ novos chamados reais
- Quando novos setores são cadastrados
- Quando acurácia cair abaixo de 80%
- Periodicamente (1x por trimestre)

---

## Suporte e Contato

Para dúvidas técnicas:

1. Consultar [INTEGRACAO-SINALIZA.md](INTEGRACAO-SINALIZA.md)
2. Ver logs: `docker logs sinaliza-ai` ou `npm run dev:service`
3. Rodar testes: `npm test`
4. Executar demonstração: `npm run demo:http`

---

**Versão**: 1.0  
**Data**: 23 de setembro de 2026  
**Pronto para Produção**: ✅ Sim
