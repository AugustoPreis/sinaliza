import { readFile, writeFile } from 'node:fs/promises';
import { classifyDynamic, rankCandidates, type Policy } from '../src/classification/dynamic.js';
import { holdoutCases } from './dynamic-evaluation-data.js';

const policy=JSON.parse(await readFile('config/dynamic-policy.json','utf8')) as Policy;
const rows=[];
let beforeSuggestions=0,beforeCorrect=0,beforeFalsePositive=0,beforeCorrectAbstention=0,beforeIncorrectAbstention=0;
let suggestions=0,correct=0,falsePositive=0,correctAbstention=0,incorrectAbstention=0;
for(const item of holdoutCases){
 const ranked=await rankCandidates(item.description,item.candidates);
 const top=ranked[0]!; const margin=top.score-(ranked[1]?.score ?? 0);
 const beforeSuggested=top.score>=0.25 && margin>=0.20;
 if(beforeSuggested){beforeSuggestions++;if(top.id===item.expected)beforeCorrect++;else beforeFalsePositive++;}
 else if(item.expected===null)beforeCorrectAbstention++;else beforeIncorrectAbstention++;
 const result=await classifyDynamic(item.description,item.candidates,policy);
 if(result.sector_id!==null){suggestions++;if(result.sector_id===item.expected)correct++;else falsePositive++;}
 else if(item.expected===null)correctAbstention++;else incorrectAbstention++;
 rows.push({...item,ranked,beforeSuggested,result});
}
const summarize=(s:number,c:number,fp:number,ca:number,ia:number)=>({
 total:rows.length,suggestions:s,correctSuggestions:c,falsePositives:fp,correctAbstentions:ca,incorrectAbstentions:ia,
 coverage:s/rows.length,suggestionPrecision:s?c/s:0,
});
const report={scope:'synthetic holdout with present, missing-class, sparse-catalog and out-of-domain cases; not independent real-world accuracy',policy,
 before:summarize(beforeSuggestions,beforeCorrect,beforeFalsePositive,beforeCorrectAbstention,beforeIncorrectAbstention),
 after:summarize(suggestions,correct,falsePositive,correctAbstention,incorrectAbstention),rows};
await writeFile('reports/dynamic-evaluation.json',JSON.stringify(report,null,2)+'\n');
console.log({before:report.before,after:report.after});
