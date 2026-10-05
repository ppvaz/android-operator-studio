import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePlan } from '../core/plan.js';
import type { Plan } from '../core/plan.js';
import { execute } from '../core/runtime.js';
import { FixtureTarget } from '../device/fixture.js';
import type { Target } from '../core/port.js';

async function example(): Promise<Plan> { const value: unknown = JSON.parse(await readFile('examples/fixture-toggle.json', 'utf8')); return parsePlan(value); }
test('a verified contact retains fresh observations and the shared plan identity', async () => {
  const result = await execute(await example(), new FixtureTarget());
  assert.equal(result.verdict, 'PASS'); assert.equal(result.level, 'FIXTURE'); assert.equal(result.steps.length, 3);
  assert.equal(result.steps[1]?.dispatched, true);
  assert.deepEqual(result.steps[1]?.observations.map(observation => observation.facts['screen']), ['ready', 'active']);
  assert.match(result.planHash, /^[a-f0-9]{64}$/);
});
test('transport acknowledgement without the expected effect times out', async () => {
  const plan = await example(); const node = plan.nodes[1]; assert.ok(node?.kind === 'tap');
  node.x = 0; node.y = 0; node.deadlineMs = 70;
  const result = await execute(plan, new FixtureTarget());
  assert.equal(result.verdict, 'TIMEOUT'); assert.equal(result.steps.at(-1)?.dispatched, true);
  assert.equal(result.steps.length, 2);
});
test('missing precondition observations return UNKNOWN and never dispatch a contact', async () => {
  const plan = await example(); const node = plan.nodes[1]; assert.ok(node?.kind === 'tap'); node.before.fact = 'missing';
  const result = await execute(plan, new FixtureTarget());
  assert.equal(result.verdict, 'UNKNOWN'); assert.equal(result.steps.at(-1)?.dispatched, false);
});
test('a contradicted precondition returns FAIL without side effects', async () => {
  const plan = await example(); const node = plan.nodes[1]; assert.ok(node?.kind === 'tap'); node.before.equals = 'wrong';
  const result = await execute(plan, new FixtureTarget()); assert.equal(result.verdict, 'FAIL');
  assert.equal(result.steps.at(-1)?.dispatched, false);
});
test('observation hangs cannot escape the runtime deadline', async () => {
  const plan = await example(); const first = plan.nodes[0]; assert.ok(first); first.deadlineMs = 25;
  const hanging: Target = { name: 'hang', level: 'FIXTURE',
    observe: () => new Promise(() => {}), tap: async () => {} };
  const result = await execute(plan, hanging); assert.equal(result.verdict, 'TIMEOUT');
});
test('cancel interrupts a wait and prevents following actions', async () => {
  const plan = parsePlan({ schema: 'operator-plan/v1', name: 'cancel', entry: 'wait', maxSteps: 3, timeoutMs: 3000,
    nodes: [{ id: 'wait', kind: 'wait', label: 'wait', durationMs: 1000, deadlineMs: 2000, next: {} }] });
  const controller = new AbortController(); const result = execute(plan, new FixtureTarget(), controller.signal);
  setTimeout(() => controller.abort(), 20);
  assert.equal((await result).verdict, 'CANCELLED');
});
test('bounded loops stop even when every observation passes', async () => {
  const plan = parsePlan({ schema: 'operator-plan/v1', name: 'loop', entry: 'observe', maxSteps: 4, timeoutMs: 1000,
    nodes: [{ id: 'observe', kind: 'observe', label: 'observe', deadlineMs: 100, next: { PASS: 'observe' } }] });
  const result = await execute(plan, new FixtureTarget()); assert.equal(result.verdict, 'TIMEOUT'); assert.equal(result.steps.length, 4);
});
test('explicit failure branches can recover and all outcomes remain in the trace', async () => {
  const plan = await example(); const tap = plan.nodes[1]; assert.ok(tap?.kind === 'tap');
  tap.before.equals = 'wrong'; tap.next.FAIL = 'check';
  const check = plan.nodes[2]; assert.ok(check?.kind === 'check'); check.condition.equals = 'ready';
  const result = await execute(plan, new FixtureTarget()); assert.equal(result.verdict, 'PASS');
  assert.deepEqual(result.steps.map(step => step.verdict), ['PASS', 'FAIL', 'PASS']);
});
test('invalid graphs and arbitrary shell fields are rejected before execution', async () => {
  const plan = await example(); const first = plan.nodes[0]; assert.ok(first); first.next.PASS = 'does-not-exist';
  assert.throws(() => parsePlan(plan));
  const arbitrary = await example(); assert.throws(() => parsePlan({ ...arbitrary, shell: 'arbitrary' }));
  const duplicate = await example(); const source = duplicate.nodes[0]; assert.ok(source); duplicate.nodes.push(structuredClone(source));
  assert.throws(() => parsePlan(duplicate));
});
