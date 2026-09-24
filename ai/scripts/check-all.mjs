import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
execFileSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run'], { stdio: 'inherit', env: { ...process.env, RUN_MINILM_TESTS: '1' } });
