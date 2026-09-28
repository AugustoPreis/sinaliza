import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ai = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(ai, '../api');
const aiOnly = process.argv.includes('--ai-only');
const packageName = aiOnly ? 'sinaliza-ia' : 'sinaliza-grupo';
const stage = await mkdtemp(join(tmpdir(), 'sinaliza-entrega-'));
const root = join(stage, packageName);
let latest;
try { latest = JSON.parse(await readFile(join(ai, 'models/latest.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try {
  // Explicit allowlists: no private data, env files, dependencies or caches.
  const aiPaths = ['src', 'tests', 'scripts', 'config/dynamic-policy.json', 'config/sectors.mock.json', 'config/backend-demo-sector-map.json', 'data/mock',
    ...(latest ? ['models/latest.json', latest.modelPath, latest.reportPath] : []),
    'reports/avaliacao.md', 'reports/dynamic-calibration.json', 'reports/dynamic-evaluation.json', 'reports/structured-api-example.json', 'reports/structured-api-evaluation.json',
    'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts',
    'README.md', 'docs', '.env.example', '.gitignore', '.nvmrc', '.node-version', '.npmrc'];
  try { await access(join(ai, 'models/release/manifest.json')); aiPaths.push('models/release'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const backendPaths = ['src', 'test', 'docs', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
    'tsconfig.json', 'tsconfig.build.json', 'nest-cli.json', 'eslint.config.mjs', '.prettierrc',
    '.prettierignore', '.dockerignore', '.env.example', 'README.md', 'Dockerfile',
    'Dockerfile.dev', 'docker-compose.yml', 'docker-compose.override.yml'];
  const webPaths = ['src', 'public', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'eslint.config.mjs', 'index.html', 'components.json', '.env.example', '.prettierrc', 'README.md'];
  for (const [source, folder, paths] of [[ai, 'ai', aiPaths], [backend, 'api', backendPaths], [resolve(backend, '../web'), 'web', webPaths]].filter(([, folder]) => !aiOnly || folder === 'ai')) {
    for (const path of paths) {
      const target = join(root, folder, path);
      await mkdir(dirname(target), { recursive: true });
      await cp(join(source, path), target, { recursive: true, filter: async p => {
        const name = p.split('/').pop();
        return !['node_modules', '.git', '.env', '.env.local', '.cache'].includes(name);
      } });
    }
  }
  await writeFile(join(root, 'LEIA-ME.txt'), 'Abra ai/README.md. Classificação dinâmica local; provisione os pesos do encoder antes de iniciar. Relatórios históricos MOCK não representam a qualidade da estratégia atual.\n');
  const hashes = [];
  async function inventory(dir, relative = '') {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      const label = `${relative}${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Link não permitido na entrega: ${label}`);
      if (entry.isDirectory()) await inventory(path, `${label}/`);
      else hashes.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${label}`);
    }
  }
  await inventory(root);
  await writeFile(join(root, 'SHA256SUMS'), `${hashes.join('\n')}\n`);
  execFileSync('zip', ['-qr', join(stage, `${packageName}.zip`), packageName], { cwd: stage, stdio: 'inherit' });
  const dest = join(ai, 'deliverables');
  await mkdir(dest, { recursive: true });
  await cp(join(stage, `${packageName}.zip`), join(dest, `${packageName}.zip`));
  console.log(`Entrega: ${join(dest, `${packageName}.zip`)} (${hashes.length} arquivos + manifesto SHA256)`);
} finally { await rm(stage, { recursive: true, force: true }); }
