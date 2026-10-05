import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { z } from 'zod';
import { parsePlan } from '../core/plan.js';
import { identity } from '../core/identity.js';

test('a real MCP client validates and executes the same plan over stdio', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'operator-mcp-'));
  const client = new Client({ name: 'contract-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('dist/mcp.js')], cwd: directory });
  const textResult = (value: unknown): unknown => {
    const response = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })), isError: z.boolean().optional() }).parse(value);
    assert.ok(!response.isError); const text = response.content.find(item => item.type === 'text')?.text; assert.ok(text);
    const parsed: unknown = JSON.parse(text); return parsed;
  };
  try {
    await client.connect(transport);
    const tools = await client.listTools(); assert.ok(tools.tools.some(tool => tool.name === 'run_cancel'));
    const value: unknown = JSON.parse(await readFile('examples/fixture-toggle.json', 'utf8')); const plan = parsePlan(value);
    const validated = textResult(await client.callTool({ name: 'plan_validate', arguments: { plan } }));
    assert.equal(z.object({ planHash: z.string() }).parse(validated).planHash, identity(plan));
    const started = textResult(await client.callTool({ name: 'run_start', arguments: { plan, target: { kind: 'fixture' } } }));
    const { id } = z.object({ id: z.string() }).parse(started);
    let done = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const status = z.object({ status: z.string(), result: z.object({ verdict: z.string(), planHash: z.string() }).optional() }).parse(
        textResult(await client.callTool({ name: 'run_status', arguments: { id } })));
      if (status.status === 'DONE') { assert.equal(status.result?.verdict, 'PASS'); assert.equal(status.result?.planHash, identity(plan)); done = true; break; }
      await sleep(10);
    }
    assert.equal(done, true);
    const research=parsePlan(JSON.parse(await readFile('examples/pokemon-menu-party-research.json','utf8')));
    const result=z.object({planHash:z.string()}).parse(textResult(await client.callTool({name:'plan_validate',arguments:{plan:research}})));
    assert.equal(result.planHash,identity(research));
    const refusal=z.object({isError:z.literal(true),content:z.array(z.object({type:z.string(),text:z.string().optional()}))}).parse(
      await client.callTool({name:'run_start',arguments:{plan:research,target:{kind:'fnaf-companion',serial:'research-qualification-required'}}}));
    assert.ok(refusal.content.some(item=>item.text?.includes('somente leitura')));
  } finally { await client.close(); await rm(directory, { recursive: true, force: true }); }
});
