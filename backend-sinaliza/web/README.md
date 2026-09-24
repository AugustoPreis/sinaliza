# Sinaliza - Web

Portal do Setor e Portal da Administração do Sinaliza (React + Vite,
TanStack Router, Radix/Tailwind, React Query, Zustand). Projeto standalone,
sem relação de monorepo com `../api` - se comunica com ela só via HTTP.

## Como rodar

1. Copie `.env.example` para `.env` nesta pasta e aponte `VITE_API_BASE_URL`
   para onde a API (`../api`) estiver rodando.
2. Instale as dependências e gere o client HTTP a partir do Swagger da API
   (precisa da API rodando):

   ```sh
   pnpm install
   pnpm api:generate
   pnpm dev
   ```

Ou via Docker (`docker compose up`, com hot-reload em dev).

Login com um usuário de Setor ou Administrador criado pela API (ver
`../api/README.md`).
