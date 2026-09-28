import { writeFile } from 'node:fs/promises';
import { effectiveMinimumScore, rankCandidates, type Policy } from '../src/classification/dynamic.js';
import { calibrationCases } from './dynamic-evaluation-data.js';

interface RankedCase extends (typeof calibrationCases)[number] { ranked: Awaited<ReturnType<typeof rankCandidates>> }
interface Metrics {
  total: number; suggestions: number; correctSuggestions: number; falsePositives: number;
  correctAbstentions: number; incorrectAbstentions: number; coverage: number; suggestionPrecision: number;
}
function metrics(rows: RankedCase[], policy: Policy, scarcityAdjusted: boolean): Metrics {
  let suggestions=0, correctSuggestions=0, falsePositives=0, correctAbstentions=0, incorrectAbstentions=0;
  for (const row of rows) {
    const top=row.ranked[0]!; const margin=top.score-(row.ranked[1]?.score ?? 0);
    const minimumScore=scarcityAdjusted ? effectiveMinimumScore(policy,row.candidates.length) : policy.minimumScore;
    const suggested=top.score>=minimumScore && margin>=policy.minimumMargin;
    if (suggested) { suggestions++; if (top.id===row.expected) correctSuggestions++; else falsePositives++; }
    else if (row.expected===null) correctAbstentions++; else incorrectAbstentions++;
  }
  return {total:rows.length,suggestions,correctSuggestions,falsePositives,correctAbstentions,incorrectAbstentions,
    coverage:suggestions/rows.length,suggestionPrecision:suggestions ? correctSuggestions/suggestions : 0};
}
const rows: RankedCase[]=[];
for (const item of calibrationCases) rows.push({...item,ranked:await rankCandidates(item.description,item.candidates)});
const baselinePolicy={minimumScore:0.25,minimumMargin:0.20};
const baseline=metrics(rows,baselinePolicy,false);
const policies=[];
const globalPolicies=[];
for(let score=15;score<=60;score+=5) for(let margin=5;margin<=40;margin+=5){
  const policy={minimumScore:score/100,minimumMargin:margin/100};
  policies.push({...policy,...metrics(rows,policy,true)});
  globalPolicies.push({...policy,...metrics(rows,policy,false)});
}
globalPolicies.sort((a,b)=>a.falsePositives-b.falsePositives || b.correctSuggestions-a.correctSuggestions ||
  b.suggestionPrecision-a.suggestionPrecision || a.incorrectAbstentions-b.incorrectAbstentions ||
  a.minimumScore-b.minimumScore || a.minimumMargin-b.minimumMargin);
const bestGlobal=globalPolicies[0]!;
const eligiblePolicies=policies.filter(item => item.minimumScore >= baselinePolicy.minimumScore &&
  item.minimumMargin >= baselinePolicy.minimumMargin);
eligiblePolicies.sort((a,b)=>a.falsePositives-b.falsePositives || b.correctSuggestions-a.correctSuggestions ||
  b.suggestionPrecision-a.suggestionPrecision || a.incorrectAbstentions-b.incorrectAbstentions ||
  a.minimumScore-b.minimumScore || a.minimumMargin-b.minimumMargin);
const selected=eligiblePolicies[0]!;
const selectedPolicy={minimumScore:selected.minimumScore,minimumMargin:selected.minimumMargin};
await writeFile('config/dynamic-policy.json',JSON.stringify(selectedPolicy,null,2)+'\n');
await writeFile('reports/dynamic-calibration.json',JSON.stringify({
  scope:'synthetic development calibration with present, missing-class, sparse-catalog and out-of-domain cases; not independent accuracy',
  selection:'do not weaken the established score/margin floors; then minimize false positives, maximize correct suggestions and prefer lower thresholds',
  decision:'candidate-scarcity-adjusted minimum score = minimumScore + minimumMargin / max(1, candidateCount - 1)^2 for catalogs with fewer than four candidates',
  baselinePolicy,baseline,bestGlobal,selected,rows,globalPolicies,policies,
},null,2)+'\n');
console.log({baseline,selected});
