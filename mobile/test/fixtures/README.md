# Fixtures de payloads da API

Conteúdo de `data`, já sem o envelope `{ success, data, timestamp }`, que o
`ApiClient` remove.

| Pasta   | Origem |
|---------|--------|
| `docs/` | Exemplos copiados de [`endpoints-sinaliza.md`](../../../endpoints-sinaliza.md). Só entram os endpoints cujo formato bate com a API real. O `user` do auth no documento (`institutional_link`, `roles: ["REQUESTER"]`) **não** bate: a API usa `MeResponseDTO` em camelCase. |
| `api/`  | Montados a partir dos DTOs reais em `api/src/modules/**/dtos` (ids em UUID, datas ISO com milissegundos, textos da linha do tempo gerados por `describeEvent`). |

## Recapturar da API local

Com a API rodando e um usuário solicitante cadastrado:

```bash
cd mobile
dart run tool/capture_fixtures.dart \
  --api http://localhost:3000/api/v1 --login aluno@instituicao.edu.br --password ...
```

O script grava em `test/fixtures/api/` só o `data` de cada resposta. Revise o
diff antes de commitar: e-mails e nomes reais não devem ir para o repositório.
