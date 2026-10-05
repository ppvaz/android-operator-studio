import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { Operator } from '../operator.js';
import { parsePlan } from '../core/plan.js';
import { identity } from '../core/identity.js';
import { createStudioServer } from '../server.js';

test('operator refuses live contacts, enforces one active run, and retains the plan and result', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'operator-test-'));
  try {
    const operator = new Operator(directory);
    const value: unknown = JSON.parse(await readFile('examples/fixture-toggle.json', 'utf8')); const plan = parsePlan(value);
    await assert.rejects(operator.start(plan, { kind: 'adb-readonly', serial: 'fixture-phone' }), /somente leitura/);
    const id = await operator.start(plan, { kind: 'fixture' });
    await assert.rejects(operator.start(plan, { kind: 'fixture' }), /execução ativa/);
    for (let attempt = 0; operator.status(id).status === 'RUNNING' && attempt < 200; attempt++) await sleep(5);
    const status = operator.status(id); assert.equal(status.status, 'DONE'); assert.equal(status.result?.verdict, 'PASS');
    assert.deepEqual(await operator.store.loadPlan(identity(plan)), plan);
    const stored: unknown = JSON.parse(await readFile(join(directory, 'runs', id, 'result.json'), 'utf8'));
    assert.equal(z.object({ verdict: z.string() }).parse(stored).verdict, 'PASS');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('HTTP editor validates the same identity and rejects invalid artifacts and origins', async () => {
  const server = createStudioServer(); server.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
  try {
    const value: unknown = JSON.parse(await readFile('examples/fixture-toggle.json', 'utf8')); const plan = parsePlan(value);
    const response = await fetch(`${base}/api/validate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(plan) });
    assert.equal(response.status, 200);
    const result: unknown = await response.json(); assert.equal(z.object({ planHash: z.string() }).parse(result).planHash, identity(plan));
    const invalid = await fetch(`${base}/api/validate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); assert.equal(invalid.status, 400);
    const foreign = await fetch(`${base}/api/example`, { headers: { origin: 'https://unrelated.example' } }); assert.equal(foreign.status, 403);
    const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /Fluxo de execução/);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
