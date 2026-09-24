# Verificação da entrega — 23/09/2026

- IA: `npm run check` aprovado (build TypeScript; 28 testes aprovados, 1 ignorado).
- Backend: `npm test -- --runInBand` aprovado (106 suítes, 567 testes); `npm run build` aprovado.
- Teste manual de uma descrição: computador do laboratório → TI.
- Sessão interativa: computador → TI; renovação de livro → Biblioteca; `/sair` encerra.
- Cópia do artefato conferida por comparação estrutural: somente `metadata.dataSource=MOCK` foi acrescentado.
- Hash SHA-256 do dataset congelado permanece `e75a5a6bee757a59c0c71d002bddca52d4b453a3a67ac3a4c989e8108d713b18`.
- Modelo e dataset não foram retreinados ou regenerados.
- Corrigido cálculo de confidence do classificador por centroides: similaridade cosseno em vez de 1 constante. Teste cobre vetor alinhado, empate e vetor sem sinal.
- Testes HTTP cobrem cookie de autenticação na consulta de setores, Bearer na IA, timeout, setor novo, payload inválido, modo desativado e bloqueio de MOCK em produção.

Os testes HTTP exigem permissão para abrir portas locais. No ambiente de revisão, foram
executados fora do sandbox após a restrição a portas locais. Não houve acesso ao banco
real, execução de migrations, seed ou envio de mensagens. Logs de storage/e-mail nos testes
do backend vêm de testes com mocks, não de implantação do sistema.

O teste MiniLM permanece ignorado por padrão: é opcional e não faz parte do caminho TF-IDF
entregue. Não foi feita instalação em uma máquina nova, homologação com PostgreSQL/JWT real
ou validação de precisão em dados reais. Os 68,39% de acurácia são os valores registrados
no artefato MOCK original, não uma nova medição nem garantia para novas descrições.

## Complemento de supervisão humana

Frontend: dependências instaladas pelo lockfile; nova rota `/tickets/new`; build e lint
dos arquivos editados aprovados. Verificação por agent-browser: página de login renderizou;
tela de abertura renderizou com sessão simulada. Consultas ao backend não disponível
impedem validar interação completa. Não é homologação de ponta a ponta.

Modelo para banco MOCK: comparação de vetorizador/centroides e duas inferências confirmou
preservação de pesos e previsões ao converter os IDs conforme o mapa explícito. Build da
IA aprovado. Nenhum setor cadastrado e nenhuma migration executada.

Bloqueios externos: Docker retorna `permission denied` no socket mesmo fora do sandbox;
`docker compose` não está instalado; autorização para inicializar banco separado não recebida.

Revalidação da supervisão humana: 3 suítes e 19 testes aprovados para criação,
reencaminhamento e resolução. O teste de reencaminhamento agora exige explicitamente que
o patch não contenha `automaticSectorId`, `confirmedSectorId` ou `resolvedBySectorId`.
Servidor Vite e navegador temporários encerrados após a verificação.
