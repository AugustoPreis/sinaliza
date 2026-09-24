# Checklist do projeto

Este arquivo deve ser atualizado sempre que uma tarefa for concluída ou uma nova tarefa for identificada.

Legenda:

- `[x]` concluído
- `[ ]` pendente

## Configuração

- [x] Inicializar o projeto TypeScript
- [x] Configurar `package.json` e scripts npm
- [x] Configurar o TypeScript em modo estrito
- [x] Configurar arquivos ignorados pelo Git
- [x] Documentar a exigência de Node.js 20 ou superior
- [x] Adicionar arquivos de versão para Node 22 (`.nvmrc` e `.node-version`)
- [x] Bloquear instalações com uma versão incompatível do Node
- [x] Instalar as dependências

## Dataset

- [x] Criar o CSV mock inicial, separado de dados oficiais
- [x] Adicionar 80 chamados sintéticos balanceados
- [x] Incluir TI, Secretaria Acadêmica, Financeiro e Biblioteca
- [x] Incluir erros, informalidade, abreviações e nomes institucionais
- [x] Implementar carregamento e validação do CSV
- [x] Implementar split estratificado 80/10/10
- [x] Bloquear textos duplicados antes do split para evitar vazamento
- [x] Implementar gerador de exatamente 10.000 registros balanceados
- [x] Validar tamanho, IDs, cobertura, UTF-8, balanceamento e duplicatas
- [x] Exigir exemplos representativos externos para cada setor
- [x] Gerar variações a partir dos exemplos, sem inserir o nome do setor
- [x] Validar variedade de comprimentos e repetição excessiva de inícios
- [x] Validar vazamento explícito do nome do setor no texto
- [x] Gerar manifesto completo do dataset mock de 10.000 registros
- [x] Tornar o split reproduzível por seed
- [x] Permitir selecionar outro dataset por `DATASET_PATH`
- [x] Criar importador seguro para chamados reais
- [x] Aceitar aliases comuns de colunas e resolver setores pela configuração externa
- [x] Detectar e remover e-mail, CPF, telefone, RA e URL
- [x] Remover duplicatas exatas durante a preparação
- [x] Gerar relatório privado de distribuição, redações e alertas
- [x] Bloquear datasets privados no Git
- [x] Salvar arquivos preparados com permissão restrita ao usuário
- [ ] Substituir ou complementar os dados sintéticos com chamados reais anonimizados
- [ ] Implementar agrupamento de paráfrases antes do split quando houver dados derivados

## Pré-processamento

- [x] Preservar o texto original
- [x] Criar normalização conservadora separada
- [x] Integrar `nspell`
- [x] Integrar o dicionário português `dictionary-pt`
- [x] Criar o vocabulário institucional
- [x] Evitar a correção de termos institucionais
- [x] Evitar correções quando a melhor sugestão for ambígua
- [x] Otimizar a correção usando reconhecimento integral e sugestões compactas do domínio
- [x] Testar a correção nspell otimizada sem inicialização pesada

## TF-IDF e Random Forest

- [x] Implementar Word TF-IDF
- [x] Implementar Character TF-IDF com n-grams de 3 a 5 caracteres
- [x] Implementar Word + Character TF-IDF
- [x] Persistir vocabulário, IDF e configuração
- [x] Garantir que a inferência não reajuste o TF-IDF
- [x] Criar abstração reutilizável para Random Forest
- [x] Persistir e carregar a Random Forest
- [x] Calcular confiança com os votos reais das árvores
- [x] Implementar treinamento TF-IDF
- [x] Implementar inferência TF-IDF
- [x] Treinar e salvar o modelo Word TF-IDF inicial

## MiniLM

- [x] Integrar `all-MiniLM-L6-v2` com Transformers.js
- [x] Executar o modelo localmente, sem API externa
- [x] Implementar processamento em batch
- [x] Aplicar mean pooling e normalização L2
- [x] Validar embeddings com 384 dimensões
- [x] Treinar Random Forest sobre os embeddings
- [x] Persistir os metadados e o classificador
- [x] Implementar inferência MiniLM
- [x] Treinar e salvar o modelo MiniLM inicial
- [x] Executar o teste pesado de integração do MiniLM

## Avaliação

- [x] Implementar accuracy
- [x] Implementar precision, recall e F1 por classe
- [x] Implementar macro-F1 e weighted-F1
- [x] Implementar matriz de confusão legível
- [x] Medir tempo de treinamento
- [x] Medir latência média sequencial
- [x] Medir tamanho dos artefatos
- [x] Criar avaliação TF-IDF
- [x] Criar avaliação MiniLM
- [x] Criar benchmark dos cinco experimentos
- [x] Executar a avaliação do Word TF-IDF inicial
- [x] Executar a avaliação do MiniLM inicial
- [x] Executar o benchmark completo dos cinco experimentos
- [x] Analisar e registrar os resultados do benchmark completo

## Testes e qualidade

- [x] Testar normalização
- [x] Testar vocabulário institucional
- [x] Testar seleção conservadora de correções
- [x] Testar carregamento e split do dataset
- [x] Testar TF-IDF e character n-grams
- [x] Testar persistência da Random Forest
- [x] Testar inferência TF-IDF
- [x] Testar métricas
- [x] Testar detecção de dados pessoais e anonimização
- [x] Testar preparação de CSV real, aliases, duplicatas e setores inválidos
- [x] Separar testes pesados de MiniLM e nspell
- [x] Executar os testes unitários rápidos
- [x] Executar build TypeScript sem erros
- [ ] Adicionar lint e formatação automática
- [x] Revisar os avisos de segurança das dependências npm
- [x] Atualizar o Node.js da máquina de desenvolvimento para 22

## Documentação e integração futura

- [x] Criar README completo
- [x] Documentar comandos de treino, avaliação e inferência
- [x] Documentar artefatos, limitações e evoluções
- [x] Criar este checklist vivo
- [x] Criar o histórico de atualizações
- [ ] Integrar o classificador a uma API NestJS
- [ ] Definir um limiar de confiança usando o conjunto de validação
- [ ] Encaminhar previsões abaixo do limiar para triagem humana
- [x] Versionar formalmente modelos, datasets e relatórios
- [ ] Criar monitoramento de desempenho e drift para produção

## Arquitetura Sinaliz e integração futura

- [x] Trocar rótulos por `sector_id` dinâmico
- [x] Remover a lista de setores do código do modelo
- [x] Criar `SectorProvider` com implementações por arquivo e mock
- [x] Criar contrato de adapter futuro para backend/API/banco
- [x] Detectar novos setores ainda desconhecidos pelo modelo
- [x] Criar `ClassifierService` e adapters TF-IDF/MiniLM
- [x] Criar serviço de preview que aceita somente `description`
- [x] Validar descrição vazia e setor de saída ativo
- [x] Criar `FeedbackRepository` local em JSONL e em memória
- [x] Registrar origem de correção `REQUESTER` ou `SECTOR`
- [x] Adicionar metadados de versão, data, dataset, setores, seed e dependências aos modelos
- [x] Cobrir geração, balanceamento, split, vazamento, provider, feedback e setor novo com testes
- [ ] Receber do backend a lista oficial de setores e seus IDs
- [ ] Gerar dataset oficial somente após receber e validar os setores oficiais
- [ ] Implementar o adapter real no repositório do backend
- [ ] Calibrar limiar de confiança com dados oficiais de validação
