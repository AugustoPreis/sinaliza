import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// The public backend owns authentication, current candidates and the decision.
// This CLI never substitutes the development catalog for the database.
const base = process.env.BACKEND_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const cookie = process.env.BACKEND_SESSION_COOKIE;
if (!cookie) throw new Error('Configure BACKEND_SESSION_COOKIE com os cookies da sua sessão (access_token e XSRF-TOKEN).');
const csrf = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length);
if (!csrf) throw new Error('O cookie XSRF-TOKEN é obrigatório.');
async function predict(description: string) {
  const response = await fetch(`${base.replace(/\/$/, '')}/classification/preview`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: cookie!, 'X-XSRF-TOKEN': decodeURIComponent(csrf!) },
    body: JSON.stringify({ description }), signal: AbortSignal.timeout(30000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Backend retornou HTTP ${response.status}. Confira sessão, permissões e disponibilidade da IA.`);
  const envelope = await response.json() as { success: boolean; data: { automatic_sector: {id:string;name:string}|null; confidence:number } };
  if (!envelope.success) throw new Error('Resposta inválida do backend.');
  return envelope.data;
}
if (process.argv.slice(2).length) {
  console.log(JSON.stringify(await predict(process.argv.slice(2).join(' ')), null, 2));
} else {
  const rl = createInterface({input:stdin,output:stdout});
  console.log('Sinaliza — classificação dinâmica pelo backend. /sair para encerrar.');
  try {
    for (;;) {
      const text = await rl.question('Chamado > ');
      if (text.trim() === '/sair') break;
      if (!text.trim()) continue;
      try {
        const result = await predict(text);
        console.log(result.automatic_sector ? `Encaminhar para ${result.automatic_sector.name}.` : 'Sem sugestão confiável. Escolha o setor manualmente na abertura do chamado.');
      } catch (error) { console.error(error instanceof Error ? error.message : 'Falha na classificação.'); }
    }
  } finally { rl.close(); }
}
