# Novo Setor: Infraestrutura

## O que foi feito

✅ Adicionado novo setor **"Infraestrutura"** para classificar problemas de:
- Manutenção de equipamentos
- Problemas elétricos
- Estrutura predial
- Instalações físicas

## Status Atual

- **Setor definido**: ✅ `config/sectors.mock.json` (linha ~60)
- **Dataset gerado**: ✅ 2000 exemplos em `data/mock/generated/mock-v1/chamados.csv`
- **Modelo treinado**: ⏳ _Ainda não treinado em produção_

### Por que não está ativo?

O treinamento TF-IDF completo com validação (que garante qualidade) demora ~2 minutos com 5 setores e 10.000 registros. Durante desenvolvimento, mantemos **apenas 4 setores ativos** para iteração rápida.

## Como Ativar em Produção

### Opção 1: Treinamento Completo (Recomendado)

```bash
# 1. Ativar o setor
sed -i 's/"active": false,  # Infraestrutura/"active": true,  # Infraestrutura/' config/sectors.mock.json

# 2. Regenerar dataset com novo setor
npm run dataset:generate:mock

# 3. Treinar modelo (espere ~2 min)
npm run train:tfidf

# 4. Copiar modelo treinado para uso
cp models/v-TIMESTAMP/tfidf-word-rf.json models/demo/tfidf.json

# 5. Reiniciar servidor
pkill -f dev:service
npm run dev:service
```

### Opção 2: Feedback Loop (Com Dados Reais)

Melhor ainda: espere coletar dados reais do Sinaliza, depois retreine o modelo com:

```bash
# Após recolher 2000+ tickets do Sinaliza
npm run dataset:prepare --source=sinaliza-api
npm run train:tfidf
```

## Validação

Depois de ativar, teste com:

```bash
export AI_SERVICE_TOKEN="seu-token"
curl -X POST http://localhost:3001/classification/preview \
  -H "Authorization: Bearer $AI_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "A tomada da sala de aula não funciona, preciso de um técnico"}'

# Esperado: {"sector_id":"Infraestrutura",...}
```

## Dados Disponíveis

### 50 Exemplos Pré-definidos

Localizados em `config/sectors.mock.json`:

```json
"Infraestrutura": {
  "examples": [
    "a tomada da sala não funciona",
    "preciso de um técnico de manutenção",
    "há vazamento de água no corredor",
    "a lâmpada está queimada",
    "ar condicionado parou de funcionar",
    ... (45 mais exemplos)
  ]
}
```

### 2000 Exemplos Gerados

Localizados em `data/mock/generated/mock-v1/chamados.csv` (linhas ~8001-10000)

Gerados com variações naturais como:
- "olá, a tomada da sala não funciona"
- "oi, preciso de manutenção urgente"
- "bom dia, há vazamento de água"

## Próximos Passos

1. **Agora**: Integre a IA com Backend Sinaliza (4 setores)
2. **Depois de 1-2 meses**: Colete dados reais e retreine com 5 setores
3. **Futuro**: Adicione mais setores conforme necessário

## Erro: MODEL_SECTORS_INCOMPATIBLE

Se receber `HTTP 409` do endpoint:

```json
{"code":"MODEL_SECTORS_INCOMPATIBLE"}
```

Significa: Setor ativo (`.active: true`) **NÃO está** no modelo.

**Solução**: Reatreinar modelo conforme "Opção 1" acima.

---

**Arquivo de Configuração**: `config/sectors.mock.json`  
**Dataset de Treinamento**: `data/mock/generated/mock-v1/chamados.csv`  
**Modelo Ativo**: `models/demo/tfidf.json`  
**Script de Retreinamento**: `npm run train:tfidf`
