import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parsePlan } from './core/plan.js';
import { configuredFnafRoot } from './device/fnaf.js';
import { hash } from './core/identity.js';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { z } from 'zod';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
const value: unknown = JSON.parse(await readFile('examples/fnaf2-night1-preview.json', 'utf8'));
const plan = parsePlan(value);
configuredFnafRoot();
const client = new Client({ name: 'fnaf-first-consumer', version: '0.1.0' });
function response(value: unknown): unknown {
  const data = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })), isError: z.boolean().optional() }).parse(value);
  assert.ok(!data.isError); const text = data.content.find(item => item.type === 'text')?.text; assert.ok(text);
  const parsed: unknown = JSON.parse(text); return parsed;
}
try {
  const env: Record<string, string> = {};
  for (const [key, entry] of Object.entries(process.env)) if (entry !== undefined) env[key] = entry;
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('dist/mcp.js')], env }));
  const started = z.object({ id: z.string() }).parse(response(await client.callTool({ name: 'run_start', arguments: { plan, target: { kind: 'fnaf-preview' } } })));
  let completed = false;
  for (let attempt = 0; attempt < 600; attempt++) {
    const status = z.object({ status: z.string(), error: z.string().optional(), result: z.object({ verdict: z.string(), planHash: z.string(), steps: z.array(z.unknown()) }).passthrough().optional() }).parse(
      response(await client.callTool({ name: 'run_status', arguments: { id: started.id } })));
    if (status.status === 'ERROR') throw new Error(status.error);
    if (status.status === 'DONE') {
      const result = status.result; assert.ok(result); assert.equal(result.verdict, 'PASS');
      const evidenceId = `fnaf-first-consumer-${hash(JSON.stringify({ planHash: result.planHash, steps: result.steps })).slice(0, 16)}`;
      await writeFile('docs/evidence/fnaf-first-consumer.json', JSON.stringify({ schema: 'operator-consumer/v1', evidenceId,
        level: 'MODEL_ONLY', deviceOpened: false, transport: 'MCP stdio', client: 'fnaf-first-consumer', result,
        scope: 'FNaF integration client consumes the operator MCP, which delegates to the original Night 1 compiler and dry-run campaign gates. Not a device win.',
        open: ['Companion native SNAP on reconnected phone', 'Stable packaged dependency consumed directly in the FNaF checkout', 'Live qualification'] }, null, 2) + '\n');
      console.log(`Verified FNaF consumer via MCP: ${evidenceId} · MODEL_ONLY · PASS`); completed = true; break;
    }
    await sleep(100);
  }
  assert.equal(completed, true, 'Consumer did not finish within its observation budget');
} finally { await client.close(); }
