import { defaultModel } from '../models/default.js';
import { createClassificationServer } from './server.js';

if (process.env.NODE_ENV === 'production') throw new Error('MOCK_MODEL_NOT_ALLOWED');
const manifest = await defaultModel();
const server = await createClassificationServer({
  ...process.env, AI_MODE: 'mock', AI_SECTOR_SOURCE: 'mock-file',
  AI_MODEL_PATH: manifest.modelPath, AI_MODEL_TYPE: manifest.modelType,
  AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN ?? 'sinaliza-local-demo-public-token-1234',
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(3001, '127.0.0.1', () => console.log('API MOCK local: http://127.0.0.1:3001/classification/preview. Teste com npm run request -- "descrição".'));
