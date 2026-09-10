# Sinaliza - API

API do Sinaliza (sistema de chamados universitário): autenticação JWT
(cookies httpOnly + refresh token), autorização por permissão (RBAC),
Postgres via TypeORM, Redis, upload de arquivos (S3/MinIO), i18n e trilha de
auditoria. Projeto standalone, sem relação de monorepo com `../web`.

## Como rodar

1. Copie `.env.example` para `.env` nesta pasta.
2. Suba os containers:

   ```sh
   docker compose up
   ```

Isso builda a imagem, roda as migrations e o seed, e deixa a API rodando em
`http://localhost:3000` (Swagger em `/api/docs`, usado pelo `web` para gerar
o client via Orval).

Um usuário administrador já é criado pelo seed, com credenciais definidas por
`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`.

Em desenvolvimento (`docker-compose.override.yml`, aplicado automaticamente),
o código roda com hot-reload e o [MailHog](http://localhost:8025) captura
qualquer e-mail enviado pela API em vez de realmente entregá-lo.

Arquivos enviados pela API (ex.: fotos de chamado) vão para uma instância
local do [MinIO](http://localhost:9001), compatível com S3.

## Sem Docker

```sh
pnpm install
pnpm migration:run
pnpm seed
pnpm start:dev
```

Requer Postgres/Redis/MinIO próprios acessíveis pelas variáveis do `.env`.
