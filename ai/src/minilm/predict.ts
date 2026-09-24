import { requiredArgument } from '../shared/utils.js';
import { loadMinilmModel, predictWithMinilm } from './model.js';
import { AI_CONFIG } from '../config/ai.js';

const args = process.argv.slice(2);
const index = args.indexOf('--model');
const path = index >= 0 ? args.splice(index, 2)[1] : `${AI_CONFIG.modelRoot}/minilm/minilm-rf.json`;
if (!path) throw new Error('Informe o caminho após --model.');
const text = requiredArgument(args, 'npm run predict:minilm -- "texto" --model caminho');
loadMinilmModel(path).then((model) => predictWithMinilm(model, text)).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
