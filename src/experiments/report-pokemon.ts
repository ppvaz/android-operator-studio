// Derive the committed record from retained operation outputs; never publishes media.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { hash } from '../core/identity.js';

const root = '.operator/experiments/pokemon-20261005';
const operationSchema = z.object({ label: z.string(), verb: z.string(), deviceId: z.string(), startedAt: z.string(),
  outcome: z.unknown().optional(), error: z.string().optional() }).passthrough();
const files = (await readdir(root)).filter(file => file.endsWith('-operation.json')).sort();
const operations: z.infer<typeof operationSchema>[] = [];
const inputs: { file: string; sha256: string }[] = [];
for (const file of files) {
  const bytes = await readFile(join(root, file));
  operations.push(operationSchema.parse(JSON.parse(bytes.toString('utf8'))));
  inputs.push({ file, sha256: hash(bytes) });
}
function operation(label: string) {
  const row = operations.find(item => item.label === label);
  if (!row) throw new Error(`Missing measured operation ${label}`);
  return row;
}
function verdict(label: string) {
  return z.object({ run: z.object({ status: z.literal('DONE'), result: z.object({ verdict: z.string() }) }) }).parse(operation(label).outcome).run.result.verdict;
}
assert.equal(verdict('002-launcher-guard'), 'FAIL');
assert.equal(verdict('003-missing-game-fact'), 'UNKNOWN');
assert.equal(verdict('008-emulator-foreground'), 'PASS');
assert.equal(verdict('014-guard-during-home'), 'FAIL');
assert.equal(verdict('024-final-foreground'), 'PASS');
assert.ok(operation('004-native-initial').error);
assert.ok(operation('029-retracted-binding').error?.startsWith('Control binding refused:'));
const contacts = ['018-start-short-a', '020-start-held-a'].map(label =>
  z.object({ control: z.literal('Start'), nominalHoldMs: z.number(), dispatchAccepted: z.literal(true),
    after: z.object({ facts: z.object({ frameSha256: z.string().length(64) }) }) }).parse(operation(label).outcome));
assert.deepEqual(contacts.map(contact => contact.nominalHoldMs), [20, 150]);
const runtime = z.object({ run: z.object({ result: z.object({ verdict: z.literal('UNKNOWN'),
  steps: z.array(z.object({ verdict: z.string() })) }) }) }).parse(operation('022-runtime-native').outcome);
assert.deepEqual(runtime.run.result.steps.map(step => step.verdict), ['PASS', 'PASS', 'UNKNOWN']);
const final = z.object({ foregroundPackage: z.literal('com.fastemulator.gbc'), projectionActive: z.literal(false) }).passthrough().parse(operation('028-final-capabilities').outcome);
const media: { file: string; sha256: string; bytes: number }[] = [];
async function retainHash(path: string, file: string) {
  const bytes = await readFile(path); media.push({ file, sha256: hash(bytes), bytes: bytes.length });
}
for (const file of (await readdir(root)).sort()) if (/\.(png|xml)$/.test(file)) await retainHash(join(root, file), file);
for (const item of operations) {
  const result = z.object({ run: z.object({ id: z.string().uuid() }) }).safeParse(item.outcome);
  if (result.success) {
    const directory = join('.operator/runs', result.data.run.id, 'frames');
    for (const file of (await readdir(directory)).sort()) await retainHash(join(directory, file), `runtime/${result.data.run.id}/${file}`);
  }
}
const guard = z.object({ run: z.object({ result: z.object({ target: z.string() }) }) }).parse(operation('002-launcher-guard').outcome);
const serial = guard.run.result.target.slice('adb-readonly:'.length);
const deviceId = operation('002-launcher-guard').deviceId;
function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return value.replaceAll(serial, `device:${deviceId}`)
    .replaceAll(resolve('..'), '<workspace>').replace(/\/Users\/[^\s]+/g, '<host-path>')
    .replace(/\/var\/folders\/[^\s]+/g, '<temporary-path>');
  if (Array.isArray(value)) return value.map((item: unknown) => sanitize(item));
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]: [string, unknown]) => [key, sanitize(item)]));
  return value;
}
const sources: Record<string, string> = {};
for (const path of ['src/experiments/pokemon.ts', 'src/experiments/report-pokemon.ts', 'docs/experiments/POKEMON-20261005.protocol.json',
  'docs/experiments/POKEMON-20261005.controls.json', 'docs/experiments/POKEMON-20261005.controls-review.json', 'examples/pokemon-native-observe.json']) sources[path] = hash(await readFile(path));
const record = {
  schema: 'operator-pokemon-experiments/v1', date: '2026-10-05', level: 'DEVICE_MEASURED', deviceId,
  method: 'Bounded exploratory tests on one phone. Questions and bounds recorded before mutations; the research harness was adapted during exploration. Visual reviews are agent judgments, separate from runtime verdicts.',
  sources, inputs, operations: sanitize(operations), withheldMedia: media,
  results: {
    entry: { launch: 'COLD RomListActivity', selection: 'Semantic Pokemon Red row', observedGame: 'Cinnabar GYM locked-door dialogue', reviewer: 'agent' },
    guards: { launcher: 'FAIL', absentGameFact: 'UNKNOWN', emulator: 'PASS', homeInterruption: 'FAIL', resumed: 'PASS' },
    nativeTransport: { initial: 'ERROR, Companion unavailable', setup: 'Existing FNaF named capture and consent controls', afterSetup: 'Native PNG and device timestamps retained', physicalSize: [1080, 2400], nativeSize: [2400, 1080], coordinateTransfer: 'UNQUALIFIED' },
    sharedRuntime: { plan: 'examples/pokemon-native-observe.json', verdicts: runtime.run.result.steps.map(step => step.verdict), finalVerdict: 'UNKNOWN', reason: 'No Pokemon semantic detector; receiving a frame is not proof of game readiness.' },
    contacts: { inputBackend: 'Diagnostic ADB, outside production runtime', nominalDurationsMs: contacts.map(contact => contact.nominalHoldMs), trialsPerDuration: [1, 1], observed: 'Both opened the Start menu; B closed it', reviewer: 'agent', postFrameSha256: contacts.map(contact => contact.after.facts.frameSha256), minimumAcceptedDurationMs: 'UNKNOWN', acceptanceReliability: 'UNKNOWN', bindingReplay: 'REFUSED after transition-related coordinate drift' },
    recovery: { observed: 'Emulator resumed in the same gym-door scene and dialogue after Home', reviewer: 'agent', pixelIdentical: false, processDeathRecovery: 'NOT_TESTED' },
    visualInstability: { observed: 'Physical task-entry screenshots shifted despite identical dimensions; some immediate post-contact native frames had partially missing game/control regions. Later independent witnesses showed the complete overworld.', cause: 'UNKNOWN; no synchronized capture comparison', implication: 'Require observed content geometry and stability before coordinate replay.' },
    final: { ...final, observedGame: 'Overworld outside the Cinnabar gym, menu closed', reviewer: 'agent' },
  },
  custody: { rawFiles: 'Local .operator/experiments/pokemon-20261005 plus runtime packs; media named by hash only in Git',
    missing: ['Complete tool transcript', 'Deposited intermediate research-harness versions before the final source; hashes exist for later operations, first two guard operations precede source hashing'],
    reproduction: 'The final harness refuses the retracted controls. Repeating contacts requires a new observed binding and experiment review.' },
  open: ['Stable viewport/physical-contact mapping', 'Positive Pokemon state detector', 'Faithfulness of immediate post-transition native capture', 'Qualified Android action adapter', 'Exploration-to-plan recording', 'Repeated-run and failure qualification'],
};
const evidenceId = `pokemon-capabilities-${hash(JSON.stringify(record)).slice(0, 16)}`;
await mkdir('docs/evidence', { recursive: true });
await writeFile('docs/evidence/pokemon-experiments-20261005.json', JSON.stringify({ evidenceId, ...record }, null, 2) + '\n');
console.log(`Derived ${evidenceId}: ${operations.length} operations, ${media.length} retained media references; native runtime PASS/PASS/UNKNOWN, replay binding refused.`);
