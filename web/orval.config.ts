import { defineConfig } from 'orval';

const input = 'http://localhost:3000/api/docs-json';

export default defineConfig({
  api: {
    input,
    output: {
      mode: 'tags-split',
      target: './src/core/api/generated',
      client: 'axios',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/core/api/http/mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
  apiZod: {
    input,
    output: {
      mode: 'tags-split',
      target: './src/core/api/schemas',
      client: 'zod',
      clean: true,
    },
  },
});
