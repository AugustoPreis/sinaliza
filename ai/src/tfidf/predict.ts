import { requiredArgument } from '../shared/utils.js';
import { loadTfidfModel, predictWithTfidf } from './model.js';
import { AI_CONFIG } from '../config/ai.js';
import { latestModelPath } from '../models/latest.js';

const args = process.argv.slice(2);
const modelFlag = args.indexOf('--model');
const explicitPath = modelFlag >= 0 ? args.splice(modelFlag, 2)[1] : undefined;
const text = requiredArgument(args, 'npm run predict:tfidf -- "texto" [--model caminho]');
(explicitPath ? Promise.resolve(explicitPath) : latestModelPath()).then(loadTfidfModel).then((model) => predictWithTfidf(model, text)).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
