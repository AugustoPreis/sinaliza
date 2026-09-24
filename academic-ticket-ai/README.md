# Sinaliza AI

> Versão atual: classificador híbrido local (TF-IDF + embeddings multilíngues). Para testar no terminal, veja [TESTES-MANUAIS.md](TESTES-MANUAIS.md); para métricas e limites, [aceitação ECC](reports/aceitacao-ecc.md). A precisão próxima de 100% ainda não foi atingida.


**Entrega da IA sem banco:** comece por [ENTREGA-IA.md](ENTREGA-IA.md). Use `npm run predict` para o modelo selecionado na comparação de Random Forest real. `npm run demo` preserva a demonstração histórica por centroides. Não execute geração de dataset para iniciar a aplicação.


Classificador local de chamados acadêmicos em TypeScript. Ele recebe **somente a descrição textual** e devolve o `sector_id`. Na integração HTTP, os setores são consultados no backend por `BackendSectorProvider`; na demonstração local, vêm da configuração MOCK. Os cinco setores atuais são exclusivamente **mock de desenvolvimento**, não uma definição oficial.

## Arquitetura

```text
CSV (`text`, `sector_id`) → split estratificado (80/10/10, seed 42)
  ├─ normalização → [nspell opcional] → TF-IDF → Random Forest (padrão) / centroides (opção explícita) → artefato JSON
  └─ normalização → MiniLM (384, mean pooling, L2) → Random Forest → artefato JSON
```

Treinamento e inferência são separados. A inferência TF-IDF carrega vocabulário, IDF, configuração e classificador persistidos; ela nunca reajusta o vetorizador. O MiniLM é baixado e executado localmente por Transformers.js/ONNX, sem API externa.

## Requisitos e instalação

- Node.js 20 ou superior (recomendado Node 22 LTS)
- npm 10 ou superior
- Espaço disponível para o cache local do modelo MiniLM

Confirme as versões antes da instalação:

```bash
node --version  # deve mostrar v20 ou superior
npm --version   # recomendado v10 ou superior
```

### Ubuntu com Node instalado pelo Snap

Se `node --version` mostrar `v10.24.1` e `which node` mostrar `/snap/bin/node`, atualize o canal do Snap:

```bash
sudo snap refresh node --channel=22/stable
hash -r
node --version
npm --version
```

Se o Snap informar que o canal precisa ser alterado explicitamente, use:

```bash
sudo snap switch node --channel=22/stable
sudo snap refresh node
hash -r
```

Depois de confirmar Node 22, refaça a instalação limpa das dependências geradas parcialmente pelo Node antigo:

```bash
rm -rf node_modules
npm install
npm run build
npm test
```

O projeto também contém `.nvmrc` e `.node-version` para quem utiliza NVM, fnm ou outro gerenciador compatível. A configuração `.npmrc` interrompe a instalação imediatamente quando a versão do Node é incompatível, evitando erros difíceis de interpretar dentro do ONNX ou TypeScript.

```bash
npm install
npm run build
npm test
```

Na primeira execução MiniLM, Transformers.js baixa os pesos do Hugging Face. As execuções seguintes usam o cache local. Para operar totalmente offline, aqueça esse cache antes de remover o acesso à rede.

## Estrutura

```text
config/               configuração externa de setores mock
data/mock/            exemplos exclusivamente de desenvolvimento
data/private/         dados reais anonimizados, ignorados pelo Git
data/feedback/        feedback local, ignorado pelo Git
reports/v1/           relatórios versionados
src/classification/   contrato e adapters do classificador
src/sectors/          SectorProvider desacoplado do backend
src/feedback/         repositório local e contrato futuro
src/dataset/          validação, carregamento e split
src/preprocessing/    normalização, nspell e termos institucionais
src/tfidf/            vetorização, treino e inferência clássica
src/minilm/           embeddings, treino e inferência semântica
src/random-forest/    classificador, probabilidade e persistência
src/evaluation/       métricas, matrizes e benchmark
models/v1/            artefatos treinados e versionados
tests/                testes rápidos e integrações pesadas
```

## Dataset

`data/mock/chamados.csv` contém 80 exemplos sintéticos iniciais. O formato é:

```csv
text,sector_id
"não consigo acessar o portal","TI"
```

O split usa seed `42`, é estratificado e produz 80% treino, 10% validação e 10% teste. Textos normalizados duplicados interrompem o processo para evitar vazamento.

Para testar a infraestrutura de 10.000 registros balanceados:

```bash
npm run dataset:generate:mock
```

O gerador valida tamanho, IDs, textos, cobertura, balanceamento e duplicatas. Ele gera somente dados marcados como mock. O dataset oficial só deve ser criado depois que o backend fornecer os setores oficiais.

Cada setor precisa trazer ao menos dois exemplos representativos. O nome não é inserido nas descrições; o vínculo supervisionado fica somente em `sector_id`:

```json
{
  "id": "id-fornecido-pelo-backend",
  "name": "nome fornecido pelo backend",
  "active": true,
  "examples": ["primeiro problema representativo", "segundo problema representativo"]
}
```

O arquivo gerado e seu manifesto ficam em `data/mock/generated/mock-v2/`. O manifesto registra distribuição, diferença entre classes, duplicatas, comprimentos, repetição de inícios, vazamento do nome da classe e cobertura dos exemplos. Essa pasta é ignorada pelo Git porque os arquivos podem ser regenerados.

Um setor novo fica imediatamente visível ao provider, mas os classificadores TF-IDF/MiniLM com Random Forest possuem classes fixas. Por isso, o serviço detecta o novo ID e exige nova geração/validação e retreinamento; ele não finge aprendizado automático.

### Uso de chamados reais

Nunca coloque uma exportação original da instituição em `data/mock` nem faça commit dela. A pasta `data/private/`, arquivos `*.real.csv` e `*.private.csv` estão bloqueados no `.gitignore`.

O importador aceita aliases de colunas, mas resolve o setor exclusivamente pela configuração externa (`id` ou `name`). Ele elimina duplicatas exatas e substitui automaticamente e-mail, CPF, telefone, RA e URL. A detecção automática não reconhece nomes com segurança; uma revisão humana continua obrigatória.

Prepare uma cópia anonimizada sem alterar o arquivo original:

```bash
npm run dataset:prepare -- "/caminho/para/exportacao.csv" --sectors "/caminho/sectors.oficial.json"
```

Isso gera, com permissão restrita ao usuário:

```text
data/private/chamados-reais.csv
data/private/chamados-reais.csv.report.json
```

Revise o CSV e o relatório localmente. Depois selecione-o sem alterar código:

```bash
DATASET_PATH=data/private/chamados-reais.csv npm run train:tfidf
DATASET_PATH=data/private/chamados-reais.csv npm run train:minilm
DATASET_PATH=data/private/chamados-reais.csv npm run benchmark
```

Antes de qualquer envio ao GitHub, execute `git status` e confirme que `data/private/` não aparece. A instituição deve autorizar o uso e definir finalidade, acesso, retenção e descarte conforme suas políticas e a LGPD.

## Treino e previsão

```bash
# Word TF-IDF (padrão)
npm run train:tfidf

# Demais representações
npm run train:tfidf -- --mode char
npm run train:tfidf -- --mode combined
npm run train:tfidf -- --mode word --spell

# MiniLM local
npm run train:minilm

npm run predict:tfidf -- "não consigo entrar no portal"
npm run predict:tfidf -- "portau fora do ar" --model models/v1/tfidf/tfidf-char-rf.json
npm run predict:minilm -- "não consigo entrar no portal"
```

O retorno tem contrato simples, adequado para ser encapsulado posteriormente por um provider NestJS:

```json
{ "sectorId": "id-fornecido-pelo-backend", "confidence": 0.91, "model": "tfidf-word-rf" }
```

`confidence` é a proporção real de votos das árvores na classe prevista, fornecida pela Random Forest; não é um valor inventado nem uma probabilidade calibrada. Antes de produção, calibre-a em validação e estabeleça um limiar para triagem humana.

### Correção ortográfica e desempenho

Para evitar vários minutos de inicialização, a execução combina duas camadas: o léxico integral de `dictionary-pt` reconhece palavras válidas, enquanto o nspell recebe um vocabulário compacto do domínio para produzir sugestões. Apenas destinos explicitamente seguros e sem ambiguidade são aceitos. Assim, o dicionário integral participa da validação sem bloquear treino, inferência ou benchmark.

## Avaliação e benchmark

```bash
npm run evaluate:tfidf
npm run evaluate:minilm
npm run benchmark
```

O benchmark treina os cinco experimentos exigidos, mostra o progresso de cada etapa, avalia apenas no conjunto de teste, apresenta a tabela comparativa e métricas por setor, e salva `reports/v1/benchmark.json`. São registrados accuracy, precision, recall, F1 por classe, macro-F1, weighted-F1, matriz de confusão, tempo de treino, latência sequencial média e tamanho do artefato.

## Como funcionam os modelos

**Word TF-IDF** pondera unigramas e bigramas conforme a frequência no chamado e raridade no corpus. **Character TF-IDF** usa n-grams de 3 a 5 caracteres, permitindo sobreposição entre `portal` e `portau`. O modo combinado concatena os dois espaços com prefixos distintos.

**MiniLM** aplica mean pooling e normalização L2 ao vetor de 384 dimensões. Ele pode aproximar frases semanticamente semelhantes mesmo sem palavras iguais. Não há fine-tuning nesta versão.

**Random Forest** recebe os vetores e combina 100 árvores. A mesma abstração serializa/carrega os dois modelos. Apesar de classificadores lineares frequentemente serem competitivos em TF-IDF esparso, Random Forest foi preservado para manter a comparação solicitada.

## Artefatos

- TF-IDF: modo, n-grams, vocabulário ordenado, IDF, opções, classes e floresta.
- MiniLM: identificador do transformer, pooling, normalização, dimensionalidade, classes e floresta.
- Os pesos MiniLM permanecem no cache gerenciado por Transformers.js.

## Testes

```bash
npm test             # suíte unitária rápida
npm run test:spell   # testes de correção e vocabulário português
npm run test:minilm  # baixa/carrega MiniLM e valida shape/norma
```

Os testes cobrem normalização, vocabulário institucional, split, TF-IDF, persistência da floresta, inferência e métricas. As integrações pesadas ficam separadas para não tornar o ciclo unitário lento.

## Limitações e evoluções

- O dataset inicial é pequeno e sintético; métricas não representam desempenho real.
- `all-MiniLM-L6-v2` é mais forte em inglês; um próximo experimento recomendado para português é um Sentence Transformer multilíngue.
- A confiança por votos não é calibrada. Avalie isotonic regression ou Platt scaling com a validação.
- A correção é conservadora: palavras curtas, institucionais ou com sugestões ambíguas permanecem intactas.
- Próximos passos: dados reais anonimizados, split por grupos, análise de drift, limiar de rejeição, versionamento formal e provider/módulo NestJS.

## Decisões de biblioteca

- O TF-IDF foi implementado no projeto para assegurar persistência completa e transformação idêntica na inferência.
- `ml-random-forest` oferece classificação multiclasse, serialização/carregamento e probabilidade por votação.
- `nspell` trabalha com o dicionário Hunspell `dictionary-pt` e aceita vocabulário customizado.
- `@huggingface/transformers` executa o modelo ONNX localmente e suporta feature extraction em batch.
