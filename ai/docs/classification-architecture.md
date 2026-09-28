# Classificação dinâmica: arquitetura e auditoria final

A implementação preserva a arquitetura existente e não depende de serviços externos. A persistência e a integração foram validadas em PostgreSQL local isolado; isso não equivale à validação acadêmica de qualidade.

## Arquitetura efetiva

```text
Description
 → PreviewClassificationUseCase
 → SectorsRepository.findAll() (UUID + nome + categorias atuais)
 → ISectorClassifierStrategy / HttpSectorClassifierStrategy
 → POST interno autenticado com description + candidates
 → classifyDynamic / encoder local / ranking cosseno / política de abstenção
 → ClassificationResult (automatic_sector = UUID/nome ou null)
 → confirmação ou escolha manual no frontend
 → CreateTicketUseCase reclassifica no servidor
 → valida correspondência com preview e UUID confirmado
 → salva automático/confirmado/atual e eventos
```

`AI_MODE=dynamic` ativa esse fluxo em ambos os processos. O default continua disabled. Modos antigos mock/trained são permitidos somente fora de produção, para comparação histórica; não são a estratégia final. O baseline keyword se abstém em empate/ausência de sinal. `topicWords` fixo da ferramenta de auditoria foi substituído por vocabulário derivado dos exemplos fornecidos, sem listas de nomes de setores.

O catálogo não é memorizado. O mesmo encoder carregado é reutilizado, mas os textos de cada catálogo são vetorizados a cada chamada. Nomes/categorias atualizados afetam a próxima classificação. Novos UUIDs participam sem treino ou edição de código; a inclusão não garante score suficiente para sugerir.

A inferência usa Transformers.js já instalado, encoder multilíngue q8 de revisão fixa. `allowRemoteModels=false`: nenhuma chamada a GPT ou outro provedor e nenhum download durante a inferência. Pesos devem ser previamente provisionados. `AI_EMBEDDINGS_CACHE_DIR` permite apontar para um cache compatível local. Os dados não saem para serviços de IA externos.

## Score e política implementados

Cada candidato é representado por `nome + categorias`, sem dicionário de setores no classificador. Descrição e candidatos são segmentados em blocos de até 400 caracteres. Cada bloco recebe embedding normalizado; médias ponderadas pelo comprimento dos blocos são normalizadas novamente. Score = cosseno truncado a [0,1]. Não é uma probabilidade de classificação correta.

`config/dynamic-policy.json` define mínimo 0,25 e margem mínima 0,20 (top1 − top2; segundo score zero quando há só um candidato). Texto com menos de três palavras se abstém antes de aceitar a sugestão. Empates jamais são decididos alfabeticamente. A pontuação do primeiro candidato é mantida em confidence para diagnóstico mesmo em abstenção; ela não representa sugestão aceita.

Justificativa dos valores: `scripts/calibrate-dynamic.ts` compara uma grade de scores de 0,25 a 0,90 (passo 0,05) e margens de 0,02 a 0,30 (passo 0,02) sobre 20 exemplos sintéticos declarados. Critério: minimizar sugestões erradas; maximizar sugestões corretas; em empate, menor score e margem. Resultado selecionado: 4 sugestões corretas, nenhuma errada e 16 abstenções na calibração (12 exemplos tinham setor esperado). O relatório armazena todas as combinações e scores. A regra de três palavras é uma política explícita de contexto mínimo, não limiar probabilístico calibrado; pode rejeitar descrições curtas legítimas.

Avaliação separada, sem selecionar limiares pelos seus resultados: 10 novos exemplos sintéticos, 5 sugestões (4 corretas, 1 errada) e 5 abstenções. Concordância das sugestões: 80% nesta amostra; cobertura: 50%. Não equivale a precisão real da instituição. Os fixtures de setores desses scripts são dados de avaliação, não dependências do runtime. A qualidade ainda é limitada, inclusive em chamados de múltiplos assuntos; não se declara 100% nem homologação acadêmica de acurácia.

## Tickets, integridade e migration

`NullableAutomaticSector1790467200000` executa apenas `ALTER TABLE tickets ALTER COLUMN automatic_sector_id DROP NOT NULL`. Preserva valores existentes e FK. Rollback tenta restaurar NOT NULL; se já houver tickets manuais, o PostgreSQL recusa, evitando apagar registros ou inventar setores para torná-los compatíveis.

Na abertura, `CreateTicketUseCase` consulta novamente a classificação com descrição e catálogo atuais. O campo automático enviado pelo cliente deve coincidir, incluindo null. Divergência gera 409 `STALE_CLASSIFICATION` antes de upload/persistência. O confirmado é resolvido pelo UUID real e pode ser qualquer setor cadastrado. Não há comprovante assinado, novo token ou tabela: a alternativa escolhida é reexecução autoritativa, com custo de uma inferência extra. Mudanças posteriores de catálogo ou do texto podem exigir novo preview, sem gravar sugestão antiga silenciosamente.

Abstenção legítima salva automático nulo, confirmado/atual escolhidos pelo solicitante, `requester_corrected=false`. Não emite AUTO_CLASSIFIED; evento REQUESTER_CONFIRMED_SECTOR com origem nula é apresentado como escolha manual. Reclassificação posterior mantém os campos históricos. Falha técnica gera erro, não escolha manual fingindo baixa confiança.

## Indicadores e contratos

`classification_outcomes` separa `accepted`, `changed`, `manual_without_suggestion` e `acceptance_percentage`. A taxa de aceitação exclui escolhas manuais. O indicador legado de resolução sem correção também usa somente tickets com sugestão no denominador; ele continua distinto da taxa de concordância humana. Agrupamentos por setor automático excluem null; listagens não marcam escolha manual como divergência de uma sugestão inexistente. Exportação preserva null e os setores confirmados, suficientes para calcular a matriz de confusão dos tickets com sugestão.

As métricas contam tickets persistidos, não todos os previews (abandonados não são registrados). Não há registro persistente da versão/score de cada preview nem medição independente de verdade absoluta. Confirmação humana é proxy. A versão e a política aparecem na resposta auditável, mas avaliação histórica por versão exigiria extensão adicional de armazenamento.

DTOs, relações nullable, contrato TypeScript/Zod e formulários Web/Mobile foram atualizados. Os clientes omitem o automático ausente no multipart. A interface permite escolha manual quando há abstenção. O Mobile recebeu apenas a adaptação de nulabilidade em entidades, parsing, envio e confirmação. O cliente Web foi regenerado pelo procedimento Orval do projeto e revisado contra o OpenAPI atual.

## Cobertura e verificações

- Testes determinísticos com encoder controlado: setor existente, UUID novo, alteração de nome/categorias, ausência de correspondência, texto curto, empate, entrada vazia e catálogo vazio.
- HTTP com encoder real, sem rede externa: candidatos recebidos, novo UUID, atualização e empate; validação/auth.
- Nest Strategy com servidor HTTP de teste: encaminha snapshot atual e valida abstenção estruturada.
- Tickets: sugestão aceita/alterada, automático nulo, adulteração/supressão da sugestão, indisponibilidade e nenhuma persistência indevida.
- Indicadores: três grupos e denominador sem tickets manuais.
- Migration: teste PostgreSQL descartável criado para preservação de dados, inserção null e recusa de rollback destrutivo.

Testes controlados não demonstram qualidade semântica. A homologação real criou um setor, reclassificou com seu UUID, alterou nome/categorias e confirmou que a chamada seguinte usou o catálogo atualizado, sem cache obsoleto ou retreinamento.

## Configuração necessária

| Processo | Variáveis |
| --- | --- |
| API e IA | `AI_MODE=dynamic`; mesmo `AI_SERVICE_TOKEN`, com pelo menos 32 caracteres. Default `disabled`. |
| API | `AI_SERVICE_URL=http://127.0.0.1:3001`, `AI_TIMEOUT_MS=15000`, além da configuração normal de banco/Redis/autenticação do projeto. |
| IA | `AI_HOST=127.0.0.1`, `AI_PORT=3001`; opcional `AI_EMBEDDINGS_CACHE_DIR` para pesos já provisionados. |
| CLI `npm run predict` | `BACKEND_API_URL=http://127.0.0.1:3000/api/v1`, `BACKEND_SESSION_COOKIE` com `access_token` e `XSRF-TOKEN`. |
| Web | `VITE_API_BASE_URL=http://localhost:3000`, `VITE_APP_NAME=Sinaliza`, conforme `web/.env.example`. |

A IA não carrega `.env` automaticamente: exportar as variáveis no processo e iniciar em `ai/`, pois a política usa caminho relativo. Nenhuma variável de provedor externo é necessária. Os pesos q8 locais são requisito de inicialização. A política é lida ao iniciar o serviço; após alterá-la, reiniciar. `calibrate:dynamic` sobrescreve a política e não deve rodar automaticamente em produção.

## Verificações executadas

Os scripts dos respectivos `package.json` foram executados com as dependências locais do projeto. Nenhum pacote ou serviço pago foi adicionado.

| Escopo / comando | Resultado observado |
| --- | --- |
| IA: `npm run check:all` | Código 0. TypeScript/build e 20 arquivos, 73 testes passaram. |
| API: `npm test -- --runInBand` | Código 0. 108 suítes, 588 testes passaram, 27,694 s. |
| API: `npm run lint` | Código 0, sem erros ou avisos reportados. |
| API: `npm run build` | Código 0; compilação Nest/TypeScript concluída. |
| Web: `npm run lint` | Código 0, sem erros ou avisos reportados; repetido após ajustes de contrato. |
| Web: `npm run build` | Código 0; `tsc -b` e Vite concluídos; repetido após ajustes de contrato. |
| API: `npm run test:integration` | Código 0. 9 suítes, 78 testes passaram, 84,896 s. Testcontainers usou a imagem local oficial construída do MinIO. |
| API: `npm run test:e2e` | Código 0. 6 suítes, 64 testes passaram, 60,335 s. |
| Avaliação: `npm run evaluate:dynamic` | Código 0: 10 exemplos, 5 sugestões, 4 corretas, 1 errada e 5 abstenções; cobertura 50%, qualidade condicional 80%. |
| Contratos Zod | Parsing das 10 respostas do relatório preserva `classification` e nulabilidade; novos indicadores preservados. |
| `git diff --check` | Sem erros. |

A IA não possui script de lint e o Web não possui script de testes. Não há script `typecheck` separado: a verificação TypeScript está nos builds (`check:all` chama `tsc` na IA). Os scripts experimentais em `ai/scripts` não fazem parte do `include` do tsconfig. A reprodução da avaliação foi feita por chamada direta ao classificador, preservando os relatórios e a política existentes; a calibração não foi refeita.

PostgreSQL, Redis e MinIO ficaram saudáveis; MailHog ficou em execução. A cadeia completa de 13 migrations foi aplicada no banco local `sinaliza_local`. A migration nullable está registrada, `automatic_sector_id` aceita NULL e a reexecução confirmou 9 tickets preservados. Integração também validou inserção nula e a recusa segura do rollback quando existem registros nulos.

## Verificação visual e limites

O fluxo Web foi validado com sessão real: login, sugestão aceita, correção manual, abstenção, criação, persistência, listagem e detalhes. A verificação no navegador não apresentou erro JavaScript relevante, informação técnica indevida nem duplicação de chamado. A expiração do token de acesso durante uma criação foi recuperada pelo refresh da sessão e por uma única repetição bem-sucedida da requisição.

## Mocks, fixtures e caminhos históricos preservados

- `predict:legacy` continua apontando para `src/classification/predict-cli.ts`: comparação/reprodução dos modelos antigos; `predict` aponta para `dynamic-cli.ts` e exige backend autenticado.
- `config/sectors.mock.json`, `backend-demo-sector-map.json`, `data/mock`, fixtures de testes e exemplos de calibração/avaliação permanecem para demonstrações e experimentos reproduzíveis. Não alimentam o catálogo de produção dinâmico.
- `demo:*`, `train:*`, classificadores TF-IDF/MiniLM supervisionados, artefatos e relatórios anteriores permanecem para comparação acadêmica e regressão. Os resultados históricos não medem a estratégia dinâmica.
- Strategy keyword permanece como baseline testado, sem registro como Strategy ativa e sem fallback silencioso. Agora abstém em ausência de sinal/empate.
- Encoders controlados e mocks de repositórios testam contratos e regras; não são evidência de qualidade semântica ou migração real.
- O vocabulário fixo da auditoria MOCK já foi substituído por vocabulário extraído dos exemplos. Nenhum desses recursos foi removido nesta continuidade.

## Pendências reais

1. Fazer teste visual autenticado do fluxo Mobile em dispositivo ou emulador; os checks automatizados não substituem essa interação.
2. Medir qualidade em chamados reais anonimizados e rotulados. Os 80% entre cinco sugestões sintéticas não homologam acurácia institucional.
3. Medir latência e consumo com catálogo e concorrência representativos. Limites atuais: 500 candidatos, 100 categorias por candidato, 255 caracteres por nome/categoria e corpo interno de 2 MiB.

Limitações conhecidas: previews abandonados não são persistidos; versão/score não são armazenados por ticket; confirmação humana não é verdade independente; chunking por caracteres não garante ausência de truncamento por tokens para qualquer entrada; backend, IA e cliente devem ser implantados com contratos compatíveis. O destino confirmado é obrigatório mesmo com abstenção; indisponibilidade técnica continua bloqueando criação porque ela exige reclassificação.
