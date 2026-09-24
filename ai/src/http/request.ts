const description = process.argv.slice(2).join(' ').trim();
if (!description) throw new Error('Uso: npm run request -- "descrição do chamado"');
const response = await fetch('http://127.0.0.1:3001/classification/preview', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.AI_SERVICE_TOKEN ?? 'sinaliza-local-demo-public-token-1234'}` },
  body: JSON.stringify({ description }), signal: AbortSignal.timeout(15000),
});
console.log(`HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;
