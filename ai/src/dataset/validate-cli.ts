import { prepareValidatedDataset } from './workflow.js';

const dataset = await prepareValidatedDataset(process.argv[2]);
console.log(JSON.stringify({ path: dataset.path, hash: dataset.hash, ...dataset.validation, split: {
  train: dataset.split.train.length, validation: dataset.split.validation.length, test: dataset.split.test.length,
}}, null, 2));
