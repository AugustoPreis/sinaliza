# Sinaliza AI

Classificação local por similaridade semântica entre a descrição do chamado e os setores atuais do banco. UUID, nome e categorias vêm do backend a cada requisição. Não há treinamento de classes fixas no caminho de produção, API paga ou envio de texto a provedores de IA.

## Execução

Recomendado Node.js 22. Na raiz, execute `cd ai` e `npm ci`.
O encoder `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, revisão
`2c4055b12046f11709e9df2c122e59ffbdc2f900`, q8, precisa estar provisionado no cache local do Transformers.js.
A inferência bloqueia downloads (`allowRemoteModels=false`). Em outra máquina, copie o cache compatível já provisionado; opcionalmente indique a pasta com `AI_EMBEDDINGS_CACHE_DIR`. Ausência dos pesos impede iniciar o serviço, sem fallback para chamadas remotas.

Exporte as variáveis de `.env.example` no processo (não há carregamento automático na IA):

```bash
export AI_MODE=dynamic
export AI_SERVICE_TOKEN='substitua-por-um-segredo-de-pelo-menos-32-caracteres'
npm run build
npm run start:service
```

No backend `api/`, configure `AI_MODE=dynamic`, `AI_SERVICE_URL=http://127.0.0.1:3001`, o mesmo `AI_SERVICE_TOKEN` e `AI_TIMEOUT_MS=15000`. Ajuste o timeout ao catálogo/hardware medido. O padrão `disabled` permanece para não ativar um serviço sem configuração.

Aplique a migration `NullableAutomaticSector1790467200000` no ambiente de destino antes de liberar abertura manual. Ela remove somente a restrição NOT NULL de `tickets.automatic_sector_id`. Não foi aplicada ao banco do usuário nesta implementação.

## Uso

Pelo frontend: descreva o problema, consulte a sugestão e confirme o setor. Quando não há sugestão confiável, escolha manualmente um setor cadastrado. Falha técnica do serviço não equivale a baixa confiança.

Pelo terminal, configure `BACKEND_API_URL` e `BACKEND_SESSION_COOKIE` com os cookies da sua sessão autenticada (`access_token` e `XSRF-TOKEN`) e execute `npm run predict`. Não versione cookies. O comando usa o backend real para obter os candidatos, uma descrição por linha; `/sair` encerra. Uma descrição por argumento retorna JSON.

## Qualidade e testes

```bash
npm run test:dynamic
npm run check:all
npm run evaluate:dynamic
```

`check:all` também cobre experimentos históricos, cujos artefatos locais precisam existir. O classificador dinâmico não depende desses artefatos de classes treinadas.

A política versionada em `config/dynamic-policy.json` exige score ≥ 0,25 e margem ≥ 0,20, além de três palavras. Os valores foram selecionados por busca em 20 exemplos sintéticos de calibração, com prioridade para minimizar sugestões erradas. Não representam probabilidades nem garantia de acerto.
Na avaliação separada de dez exemplos: cinco sugestões, quatro corretas e uma errada; cinco abstenções. A cobertura e a qualidade precisam ser medidas em chamados reais rotulados antes de homologação.

`npm run calibrate:dynamic` refaz a seleção em dados sintéticos e sobrescreve a política: use apenas como experimento, revise o diff e reinicie o serviço após aprovar uma mudança. Não rode esse comando automaticamente ao iniciar a aplicação.

## Documentação

- [Arquitetura, auditoria e limitações](docs/classification-architecture.md).
- [Contrato e configuração](docs/CONTRATO-CLASSIFICACAO.md).
- [Testes manuais](docs/TESTES-MANUAIS.md).
- `reports/dynamic-calibration.json` e `reports/dynamic-evaluation.json`: evidências da estratégia atual.

Os scripts `demo:*`, `predict:legacy`, `train:*`, datasets MOCK e relatórios antigos são experimentos históricos. Não são a implementação de produção; `mock` e `trained` são bloqueados em produção. Dados reais privados, pesos, caches e credenciais não devem ser versionados. `npm run package:ai` gera um pacote de código/documentação; ele não inclui os pesos do encoder.
