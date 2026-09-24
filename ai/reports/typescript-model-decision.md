# Decisão de modelo — Sinaliza

## Opções TypeScript/Node avaliadas

| Opção | Situação | Observação |
|---|---|---|
| TF-IDF + Centroid Similarity | Disponível e reproduzível | Baseline atual; save/load simples e inferência rápida |
| `ml-random-forest` | Já instalado | Classificador supervisionado Node, mas não é um modelo linear específico para TF-IDF; mantido como compatibilidade do artefato atual |
| Logistic Regression / LinearSVC / SGD | Sem biblioteca madura instalada no projeto | Não serão implementados manualmente |
| Naive Bayes | Possível com bibliotecas genéricas, mas não validado neste projeto | Não trocar sem benchmark confiável e manutenção comprovada |
| Embeddings Node | Transformers.js disponível | Mais pesado, exige modelo externo e não resolve automaticamente a separação entre classes; não é candidato nesta etapa |

## Decisão

Manter **TF-IDF + Centroid Similarity** como baseline TypeScript. Não há, no estado atual do projeto, uma alternativa Node/TS instalada e validada que justifique trocar o classificador sem implementar algoritmos complexos manualmente.

O dataset continua congelado e a seleção não usa o TEST. Os números de referência permanecem: Group CV Macro-F1 média 62,98%, desvio 10,22%, TEST Macro-F1 62,65% e recall da Biblioteca 12,8%.

## Pendências antes do backend

- Melhorar a generalização da classe Biblioteca.
- Reduzir a instabilidade entre grupos.
- Fazer benchmark supervisionado somente se uma biblioteca Node/TS madura for adotada conscientemente.
- Definir contrato final de inferência com o backend.
