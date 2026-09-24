# Qualidade e funcionamento — 24/09/2026

## Resultado

Não foi atingida precisão próxima de 100% para todos os chamados.
O modelo atual é híbrido: TF-IDF por palavras e embeddings multilíngues, com pesos
selecionados na validação. Continua treinado em dados MOCK.

- Validação exploratória: 22/25 grupos corretos (88%). Esse conjunto foi usado para escolher parâmetros.
- Teste separado por grupos: 19/26 corretos (73,08%).
- Modelo anterior nos mesmos 26 textos: 18/26 corretos (69,23%).
- O teste usa um representante por grupo, sem inflar a amostra com variantes quase repetidas.
  Portanto, não é uma comparação direta com os 66,5% obtidos anteriormente nas variantes completas.
- O conjunto sintético já foi explorado historicamente. Não é uma avaliação inédita com chamados reais.
- Revisão solicitada em 14/26 casos. Nos 12 não sinalizados, 12 acertos nesta amostra pequena.
  Isso NÃO significa 100% de precisão geral nem garantia para próximos chamados.
- Há sete sugestões erradas no total do teste. Elas continuam contadas como erros.

A base contém frases sem contexto, como "como consulto o regulamento", que não permitem
identificar com segurança qual setor deve responder. Para medir proximidade de 100%,
faltam chamados reais inéditos, rotulados pelos responsáveis e representativos dos setores.

## Evidências técnicas

- `npm run check:all`: compilação e 57 testes aprovados, nenhum ignorado, incluindo MiniLM.
- Aceitação HTTP: cinco setores, relato real de queda de energia e pedido de contexto para frase vaga.
- Testes de persistência verificam o modelo híbrido, a revisão fixa do transformer e dimensões dos vetores.
- Terminal verificado com entrada sequencial, `/setores`, `/ok`, `/corrigir`, `/resultado` e `/sair`.
  Essa sessão controlada verifica a interface; não é uma medição de acurácia feita pelo usuário.
- O relato real original permanece fora do treinamento. É uma regressão conhecida desde o diagnóstico.
- Não houve validação do banco ou frontend nesta etapa.

## Reprodução

- Modelo: `models/v-2026-09-24_15-27-55-791/tfidf-semantic.json`.
- Relatório com matriz de confusão, métricas por setor e previsão de cada grupo: `reports/v-2026-09-24_15-27-55-791/pipeline.json`.
- Dataset/hash: `data/mock/generated/mock-v2/chamados.csv` / `785626726299575a970b5cbc27c32c5b176e9a6f873a1c640b18e6b9fe1cb1d6`.
- Seleção inicial: 200 grupos de treino e 25 de validação.
- Ajuste final: 225 grupos (treino+validação), preservando 26 grupos de teste.
- `npm run demo:train:hybrid` reproduz comparação, seleção, ajuste e cópias de demonstração.
- `npm run predict` abre a avaliação manual. Avaliações não são salvas nem usadas para treinar.

Embeddings locais: [modelo oficial no Hugging Face](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2).
Revisão fixa `2c4055b12046f11709e9df2c122e59ffbdc2f900`, quantização q8.
A primeira execução em outra máquina baixa os pesos públicos; inferência fica local.

## Complemento: contrato estruturado e descrições complexas

65 testes da IA e 21 testes do módulo de classificação do backend aprovados. O backend
passa adiante os metadados auditáveis; veja CONTRATO-CLASSIFICACAO.md e o exemplo real
em reports/structured-api-example.json. A regressão nos mesmos 26 grupos após o novo
pré-processamento manteve 19/26 acertos (73,08%), registrada em structured-api-evaluation.json.
Sem retreinamento. O tempo de inicialização agora ocorre antes de abrir a API; medições
locais do relatório não são garantia de desempenho em outras máquinas.
