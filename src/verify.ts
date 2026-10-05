import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parsePlan } from './core/plan.js';
import { hash, identity } from './core/identity.js';
import { execute } from './core/runtime.js';
import { FixtureTarget } from './device/fixture.js';

const value: unknown = JSON.parse(await readFile('examples/fixture-toggle.json', 'utf8'));
const plan = parsePlan(value); const result = await execute(plan, new FixtureTarget());
assert.equal(result.verdict, 'PASS'); assert.equal(result.steps[1]?.dispatched, true);
const sources: Record<string, string> = {};
for (const path of ['src/core/plan.ts', 'src/core/runtime.ts', 'src/core/port.ts', 'src/device/fixture.ts', 'src/operator.ts', 'package-lock.json'])
  sources[path] = hash(await readFile(path));
const evidenceId = `bootstrap-${hash(JSON.stringify({ sources, planHash: identity(plan) })).slice(0, 16)}`;
const record = { schema: 'operator-bootstrap/v1', evidenceId, level: 'FIXTURE', sources, result,
  open: ['Android live input adapter qualification', 'ROI / OCR verification adapter', 'Local temporal execution', 'Supplier comparison', 'Branding'] };
await mkdir('docs/evidence', { recursive: true });
await writeFile('docs/evidence/bootstrap.json', JSON.stringify(record, null, 2) + '\n');
console.log(`Verified bootstrap: ${evidenceId} · FIXTURE · PASS`);
