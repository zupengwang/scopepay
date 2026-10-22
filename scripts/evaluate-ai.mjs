import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { aiConfig, createAI } from '../server/ai.mjs';
import { examples } from '../server/catalog.mjs';
if (existsSync('.env')) process.loadEnvFile('.env');
const ai = createAI(aiConfig());
if (!ai.ready) { console.error('Configure a real model before running this evaluation. No model calls were made.'); process.exit(1); }
const cases = [
  { ...examples[0], expected: { landing: 1, copy: 1, social: 1 }, total: 90000 },
  { ...examples[1], expected: { brand: 1, landing: 1, discovery: 1, revision: 2 }, total: 128000 },
  { ...examples[2], expected: {}, total: 0, needsQuestions: true }
];
const results = [];
for (const example of cases) {
  const started = performance.now();
  try {
    const result = await ai.generate({ client: example.client, brief: example.brief });
    const actual = Object.fromEntries(result.proposal.items.map(i => [i.serviceId, i.quantity]));
    const checks = { exactCatalogItems: Object.entries(example.expected).every(([id, qty]) => actual[id] === qty) && Object.keys(actual).length === Object.keys(example.expected).length, exactTotal: result.proposal.totalCents === example.total, questionsWhenNeeded: !example.needsQuestions || result.proposal.questions.length > 0 };
    const passed = Object.values(checks).every(Boolean);
    results.push({ name: example.name, passed, checks, latencyMs: Math.round(performance.now() - started), ...result });
    console.log(`${passed ? 'PASS' : 'REVIEW'} ${example.name}`);
  } catch (error) { results.push({ name: example.name, passed: false, error: error.message }); console.log(`FAIL ${example.name}: ${error.message}`); }
}
mkdirSync('data', { recursive: true });
const report = { at: new Date().toISOString(), kind: 'three-case development check; not an official benchmark', passed: results.filter(x => x.passed).length, count: results.length, results };
writeFileSync('data/ai-evaluation.json', JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(`${report.passed}/${report.count} development cases passed. Report: data/ai-evaluation.json`);
if (report.passed !== report.count) process.exitCode = 1;
