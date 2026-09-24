# Histórico de atualizações

Este arquivo registra as mudanças relevantes do projeto em ordem cronológica. Novas atualizações devem ser adicionadas no topo da seção correspondente à data.

## 10/09/2026

### Adequação completa à arquitetura Sinaliz

- Corrigido o gerador para usar `examples` representativos fornecidos por cada setor, em vez de categorias isoladas.
- O provider agora recusa setores ativos sem pelo menos dois exemplos.
- Removidos qualificadores numerados artificiais e adicionadas variações curtas, médias, longas, formais, informais, sem acentos e com erros leves.
- Adicionadas validações de vazamento pelo nome do setor, cobertura de todos os exemplos, distribuição de comprimentos e dominação de inícios de frase.
- Gerados `data/mock/generated/mock-v1/chamados.csv` e seu manifesto: 10.000 registros, 2.500 por setor mock, diferença zero, zero duplicatas e status `VALID`.

- A classificação agora usa somente `description` como entrada e retorna `sector_id`, confiança e versão do modelo.
- Removida a lista fixa de setores do código; setores são obtidos por `SectorProvider` e o conjunto atual foi marcado como mock.
- Criados providers por arquivo/em memória, contratos para adapters futuros e detecção de setores novos que exigem retreinamento.
- Criados `ClassifierService`, adapters TF-IDF/MiniLM e serviço compatível com o futuro endpoint de preview, sem realizar chamadas HTTP falsas.
- Criado `FeedbackRepository` local em JSONL com origem `REQUESTER` ou `SECTOR`; feedback não dispara retreinamento automático.
- Implementados gerador e validador de 10.000 registros balanceados. A execução prática gerou 10.000 exemplos mock com 0% de duplicatas exatas.
- O split passou de 70/15/15 para 80/10/10 com seed 42 e bloqueio de duplicatas para impedir leakage.
- O CSV passou ao contrato `text,sector_id`; dados mock, privados, feedback, modelos e relatórios foram separados.
- Artefatos agora carregam versão, data de treino, versão do dataset, IDs conhecidos, contagens, seed, dependências e configuração.
- Modelos e relatórios passaram a usar pastas versionadas `models/v1` e `reports/v1`.
- Build concluído e 21 testes rápidos aprovados; teste MiniLM pesado permanece separado.
- Fluxos completos de treino, persistência, carregamento, previsão e avaliação foram revalidados nos dois modelos versionados.
- Na divisão 80/10/10 do pequeno mock atual, MiniLM obteve 75% de accuracy e 74,17% de macro-F1; TF-IDF obteve 25% e 11,11%. Esses números não representam desempenho de produção.

### Suporte seguro a dados reais

- Adicionada seleção do dataset por meio da variável `DATASET_PATH` em todos os fluxos de treino e avaliação.
- Criado `npm run dataset:prepare` para preparar exportações reais sem alterar o arquivo original.
- O importador aceita aliases comuns de colunas e setores, valida as quatro classes e recusa setores desconhecidos.
- Implementadas detecção e redação automática de e-mail, CPF, telefone, RA e URL.
- Implementadas remoção de duplicatas exatas, análise de balanceamento e alertas de quantidade por classe.
- O conteúdo dos chamados não é exibido no relatório nem no terminal.
- CSV preparado e relatório são gravados com permissão `0600` em `data/private/`.
- `data/private/`, `*.real.csv` e `*.private.csv` foram adicionados ao `.gitignore`.
- Adicionados três testes para privacidade e preparação de dados reais.
- Validado o fluxo completo: preparação do CSV, carregamento por `DATASET_PATH` e treinamento TF-IDF.

### Benchmark completo e otimizações

- Adicionada indicação de progresso para cada um dos cinco experimentos.
- Substituída a construção padrão do nspell com mais de 300 mil entradas por uma estratégia híbrida: reconhecimento com o léxico português integral e sugestões com vocabulário compacto do domínio.
- Adicionado cache de correções e uma lista conservadora de destinos seguros, evitando alterações incorretas de palavras legítimas.
- O benchmark completo passou a terminar em aproximadamente 23 segundos neste ambiente.
- Resultados finais: Word TF-IDF 41,67%; Character TF-IDF 50%; combinado 58,33%; nspell + Word TF-IDF 41,67%; MiniLM 75%.
- O relatório completo foi salvo em `data/processed/benchmark.json`.
- Atualizado `csv-parse` para 7.0.2, eliminando a vulnerabilidade direta reportada.
- Atualizado Vitest para 5.0.0, eliminando os dois avisos moderados relacionados ao executor de testes.
- Permanecem quatro avisos indiretos no caminho Transformers.js/ONNX (`sharp` e `adm-zip`), atualmente sem correção indicada pelo npm.
- Criada configuração explícita do Vitest para não executar novamente os testes compilados em `dist`.

### Ambiente local validado

- Instalado NVM e configurado Node.js 22.23.2 com npm 10.9.8 como versão padrão.
- Instalação limpa concluída com sucesso.
- Build, testes, treinamento e inferência dos modelos TF-IDF e MiniLM foram validados na máquina de desenvolvimento.

### Compatibilidade do ambiente Node.js

- Diagnosticada a falha de instalação: o terminal estava usando Node.js 10.24.1 e npm 6.14.12 pelo Snap.
- Confirmado que os erros de sintaxe em `onnxruntime-node` e TypeScript eram consequência do Node antigo.
- Adicionados `.nvmrc` e `.node-version`, ambos indicando Node 22.
- Adicionado `.npmrc` com validação estrita de `engines` para falhar cedo em versões incompatíveis.
- Incluídas no README instruções de atualização do Node pelo Snap no Ubuntu e de reinstalação limpa das dependências.

### Documentação de acompanhamento

- Criado o arquivo `CHECKLIST.md` com tarefas concluídas e pendentes.
- Criado este histórico de atualizações.
- Registradas como pendências a execução completa do benchmark, a validação pesada do nspell e as evoluções para produção.

### Validação

- Build TypeScript executado sem erros.
- Suíte rápida finalizada com 10 testes aprovados e 2 integrações pesadas separadas.
- Integração MiniLM executada com sucesso.
- Confirmados embeddings em batch com 384 dimensões e normalização L2.
- Executados treinamento, persistência, carregamento e inferência dos modelos TF-IDF e MiniLM.
- Avaliação inicial do MiniLM: 75% de accuracy e 75,95% de macro-F1 em 12 amostras de teste.
- Avaliação inicial do Word TF-IDF: 41,67% de accuracy no mesmo conjunto de teste.
- Identificado que o dicionário português completo possui inicialização muito lenta neste ambiente; sua integração está implementada, mas o teste pesado ainda precisa ser concluído.

### Avaliação e linha de comando

- Implementadas accuracy, precision, recall, F1, macro-F1 e weighted-F1.
- Implementada matriz de confusão formatada para terminal.
- Implementadas medições de treinamento, latência e tamanho dos artefatos.
- Criados comandos de treinamento, avaliação, benchmark e previsão.
- Criado benchmark para os cinco experimentos solicitados.

### Abordagem MiniLM

- Integrado o modelo local `Xenova/all-MiniLM-L6-v2` por Transformers.js.
- Implementados embeddings em batch, mean pooling e normalização L2.
- Implementados treinamento, persistência e inferência da Random Forest sem fine-tuning do transformer.
- Criado e salvo o primeiro artefato MiniLM.

### Abordagem clássica

- Implementados Word TF-IDF, Character TF-IDF e Word + Character TF-IDF.
- Implementada persistência completa do espaço vetorial.
- Implementada Random Forest multiclasse reutilizável e serializável.
- A confiança passou a representar a proporção real de votos das árvores.
- Implementados treinamento e inferência sem retreinamento durante a previsão.
- Criado e salvo o primeiro artefato Word TF-IDF.

### Dataset e pré-processamento

- Criado dataset sintético inicial com 80 chamados, sendo 20 por classe.
- Implementado carregamento validado de CSV.
- Implementado split estratificado 70/15/15 com seed reproduzível.
- Implementada normalização conservadora preservando o texto original.
- Integrados `nspell` e `dictionary-pt`.
- Criado vocabulário institucional com SIGAA, AVA, Moodle, TCC, FIES, ENEM, RA, rematrícula, trancamento e reingresso.
- Implementada estratégia conservadora que não altera palavras quando há empate entre as melhores sugestões.

### Configuração inicial

- Inicializado o projeto TypeScript em modo estrito.
- Criada a separação de responsabilidades entre dataset, pré-processamento, TF-IDF, MiniLM, Random Forest, avaliação e código compartilhado.
- Adicionados scripts npm e documentação completa no README.
- Definido Node.js 20 ou superior como requisito do projeto.
