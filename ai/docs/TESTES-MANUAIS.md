# Testes manuais

Use o backend, frontend e IA configurados conforme o README, com migration aplicada em banco de teste e pesos locais provisionados. Os setores devem ser cadastrados pelo administrador com nome e categorias descritivos.

1. Cadastre um setor novo, por exemplo com atribuições de férias de funcionários. Consulte uma descrição correspondente; confira UUID e nome no preview. Renomeie/altere suas categorias e faça nova consulta. Não há retreinamento nem alteração de código.
2. Envie uma descrição vaga: "Preciso de ajuda com uma coisa". Confira `automatic_sector: null`, selecione qualquer setor válido, preencha local e envie. Confira automático nulo, confirmado preenchido e ausência do evento de classificação automática no ticket.
3. Consulte uma descrição específica de setor com score/margem suficientes. Confirme a sugestão; depois crie outro chamado alterando o setor confirmado. Verifique separadamente sugestões aceitas, alteradas e escolhas manuais nos indicadores.
4. No banco de teste, modifique a descrição/UUID automático do payload antes do POST. Se a reclassificação atual não corresponder, o backend deve rejeitar com 409 sem gravar o ticket.
5. Cadastre dois setores com descrições equivalentes e consulte esse assunto: deve ocorrer abstenção por margem, não seleção alfabética.

Para terminal autenticado, configure `BACKEND_API_URL` e `BACKEND_SESSION_COOKIE` (cookies `access_token` e `XSRF-TOKEN`) e rode `npm run predict` em `ai/`. Esse comando usa o catálogo real via backend. Não cole múltiplas linhas como um único chamado; use uma linha por descrição. Não compartilhe nem versione cookies.

Um setor participar dos candidatos não garante que será sugerido: score, margem e qualidade das categorias controlam a decisão. Registre sugestões erradas e abstenções; não conte só exemplos que acertaram. Os testes sintéticos não substituem chamados reais rotulados.

## Estado validado

O fluxo foi validado com PostgreSQL, Redis, API, IA e Web locais. A migration nullable foi aplicada em PostgreSQL real, preservou os dados existentes e permitiu persistir `automatic_sector` nulo. Os testes de integração e E2E foram executados com o runtime de contêiner disponível.

A homologação Web autenticada cobriu sugestão aceita, correção manual, abstenção, validações do formulário, proteção contra duplicidade, criação, persistência, listagem e detalhes. O cliente Web foi regenerado pelo procedimento Orval do projeto e revisado contra o OpenAPI atual. Consulte os resultados técnicos e as limitações em [arquitetura](classification-architecture.md).

Antes do frontend, configure `VITE_API_BASE_URL` e `VITE_APP_NAME` conforme `web/.env.example`. Os testes manuais continuam relevantes sempre que contratos, política, catálogo ou fluxo de criação forem alterados.
