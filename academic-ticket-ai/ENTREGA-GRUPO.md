# Sinaliza — entrega para o grupo

## Começar pelo terminal do VS Code

Recomendado: Node.js 22 e npm 10. Abra a pasta `academic-ticket-ai` do pacote e execute:

```bash
npm ci
npm run check
npm run demo -- "O computador do laboratório não liga"
```

Para digitar várias descrições, execute `npm run demo`, digite uma descrição por linha
e pressione Enter. Para encerrar, digite `/sair`.

Esse comando usa os exemplos já existentes por meio do modelo treinado. Não pede JWT,
não usa banco, não modifica dataset e não retreina. Retorna JSON com `sector_id`,
`automatic_sector`, `confidence`, `model` e `dataSource: MOCK`.
**É a demonstração local da IA, não uma execução do backend NestJS.**

A cópia `models/demo/tfidf.json` já acompanha o pacote. Para recriá-la no projeto original,
execute `npm run demo:prepare`: o comando verifica o SHA-256 do dataset congelado contra
os metadados do modelo original antes de marcar a cópia como MOCK. Não altera o original
nem `models/latest.json`. Não execute `ai:pipeline` ou `dataset:generate:mock` para iniciar
a aplicação: esses comandos históricos geram dados e não fazem parte desta entrega.

## O que está pronto

- Inferência TF-IDF + similaridade entre centroides, usando os artefatos existentes.
- Comando interativo para demonstração manual.
- Serviço HTTP TypeScript e estratégia HTTP do NestJS, incluídos no pacote.
- Consulta dinâmica de setores pelo backend, UUID validado pelo NestJS.
- Autenticação por cookie na consulta de setores e Bearer na chamada interna da IA.
- Timeouts, tratamento de incompatibilidade e bloqueio de MOCK em produção.
- Testes automatizados de ambas as partes, sem banco real.

Os nomes históricos de arquivos e `modelType` ainda contêm `random-forest`/`rf` por
compatibilidade. O artefato entregue contém centroides; não deve ser descrito como uma
Random Forest treinada. A implementação suporta também esse algoritmo em outros artefatos.

## Limites que precisam constar no trabalho

Não há promessa de 100% de acerto. O artefato original registra acurácia de aproximadamente
68,39% e macro-F1 de 0,6265 no teste MOCK. Esses números são históricos, não validação
com dados reais. `confidence` é similaridade cosseno, não probabilidade calibrada. Corrigimos
a normalização anterior que sempre retornava 1 para o vencedor; não houve retreinamento
nem otimização do modelo. Um texto fora do vocabulário pode ter similaridade 0 e ainda
retornar um setor pelo desempate; o usuário deve confirmar o encaminhamento.

Os únicos setores do modelo de demonstração são TI, Secretaria Acadêmica, Financeiro e
Biblioteca. Seus IDs são rótulos MOCK, não UUIDs reais. A integração de produção exige um
modelo REAL com UUIDs compatíveis; não se deve mapear os rótulos MOCK aos setores reais
silenciosamente. Setor novo gera incompatibilidade explícita, sem aprendizagem automática.

## Integração com o backend

Consulte `reports/http-backend-integration.md` para variáveis, URLs e contratos.
O código atualizado de `backend-sinaliza/api` acompanha a entrega para integrar ao projeto
do grupo. Não substitua a configuração local ou o banco do grupo pelo pacote.
O padrão `AI_MODE=disabled` é intencional. Ambos os serviços precisam de configuração
explícita para ativação. Na IA, as variáveis devem ser exportadas no processo; o serviço
não carrega `.env` automaticamente. `AI_SERVICE_TOKEN` deve ser o mesmo nos dois processos.

O backend retorna JWT no cookie `access_token` após `POST /api/v1/auth/login`.
Use esse valor em `BACKEND_API_TOKEN`. Ele expira: é necessário atualizar a configuração
e reiniciar a IA quando expirar. Não há autenticação máquina-a-máquina ou renovação
automática nesta entrega. Para testar POSTs do backend manualmente, mantenha os cookies
recebidos no login e envie `X-XSRF-TOKEN` com o mesmo valor do cookie `XSRF-TOKEN`.

O backend não foi inicializado nem conectado a banco real nesta revisão. Docker/entrypoint
podem executar migrations e seed; revise e autorize essa etapa antes de rodar. Nenhuma
migration foi criada ou executada por esta entrega, e os campos de encaminhamento foram
preservados. A demonstração do modelo local e os testes HTTP não substituem homologar o
sistema completo com banco, credenciais e setores do ambiente do grupo.

## Verificação do backend

Na pasta `backend-sinaliza/api`, com suas dependências instaladas:

```bash
pnpm install --frozen-lockfile
pnpm test -- --runInBand
pnpm build
```

Os testes padrão usam mocks e servidores HTTP locais. Não executar `test:integration`,
seed ou migrations como parte desse roteiro sem revisar a configuração de banco.

## Conteúdo da entrega

O pacote não contém `.env`, cookies, credenciais de uso, `node_modules`, caches,
`data/private` ou feedback. `.env.example` contém apenas exemplos de configuração.
Dataset e configuração MOCK estão intactos. O pacote inclui o artefato original, o relatório
associado e a cópia marcada MOCK. Não é necessário baixar o MiniLM para usar a demonstração
TF-IDF. A instalação inicial das dependências exige internet.

## Complemento: abertura com revisão humana no frontend

O pacote agora inclui `backend-sinaliza/web`, com a rota `/tickets/new` e a opção
“Abrir chamado”. Essa tela consulta a IA, permite corrigir o setor sugerido e envia
`automatic_sector_id` e `confirmed_sector_id` separadamente. Alterar a descrição invalida
a sugestão anterior. O protocolo e o destino são exibidos após sucesso.

Para o frontend: copie `.env.example` para `.env`, instale com `corepack pnpm install
--frozen-lockfile` e execute `corepack pnpm dev`. O backend precisa estar configurado e
acessível na URL definida. A conta precisa de `tickets:create` e `classification:preview`.

Foi preparado `models/demo/backend-tfidf.json` com UUIDs de demonstração definidos em
`config/backend-demo-sector-map.json`. Recrie com `npm run demo:prepare-backend`.
Os pesos, dataset e decisões do modelo são preservados; apenas os IDs da cópia são
adaptados ao mapa explícito e a origem permanece MOCK. Use esse arquivo SOMENTE num
banco separado de demonstração com exatamente esses UUIDs. Este comando não cria setores
no banco. Não use o mapa para substituir setores reais.

### Pendências de homologação — não apresentar como concluídas

- Banco separado ainda não inicializado: falta autorização explícita do proprietário.
- Docker da máquina de revisão recusa acesso ao socket; Docker Compose ausente.
- Cadastro dos setores com os UUIDs de demonstração ainda não executado.
- Teste com login real → sugestão → confirmação/correção → gravação → reencaminhamento → resolução ainda pendente.
- A tela não inventa `automatic_sector_id` quando a IA falha: bloqueia o envio e mostra erro.
  Permitir abertura puramente manual exige decidir como registrar ausência de sugestão,
  pois o contrato/banco atual exige um setor automático. Essa mudança de banco não está autorizada.
- Fotos opcionais da API não foram adicionadas a esta tela inicial.

A validação visual alcançou a renderização da tela com sessão simulada no navegador.
Não comprovou login real, persistência ou fluxo completo; sem backend, a sessão é invalidada
nas consultas. Build e lint do novo frontend foram aprovados.
