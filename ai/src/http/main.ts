import { createClassificationServer } from './server.js';

const port = Number(process.env.AI_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AI_PORT inválida.');
const server = await createClassificationServer();
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port, process.env.AI_HOST ?? '127.0.0.1', () => {
  console.log(`Serviço de classificação na porta ${port}.`);
});
