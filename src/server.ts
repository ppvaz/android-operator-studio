import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { Operator, targetSchema } from './operator.js';
import { parsePlan } from './core/plan.js';
import { identity } from './core/identity.js';
import { devices, AdbReadOnlyTarget } from './device/adb.js';
import { CompanionTarget } from './device/companion.js';

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    if (!Buffer.isBuffer(chunk)) throw new Error('Corpo inválido');
    length += chunk.length;
    if (length > 512_000) throw new Error('Plano excede 512 KB');
    chunks.push(chunk);
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  return value;
}
function json(response: ServerResponse, value: unknown, status = 200): void {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}
export function createStudioServer(operator = new Operator()) {
  return createServer((request, response) => { void route(request, response, operator); });
}
async function route(request: IncomingMessage, response: ServerResponse, operator: Operator): Promise<void> {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    // The studio is local. Cross-origin pages cannot operate its API.
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) { json(response, { error: 'Origem recusada' }, 403); return; }
    if (request.headers.host && !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(request.headers.host)) {
      json(response, { error: 'Host recusado' }, 403); return;
    }
    if (request.method === 'POST') {
      if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
        json(response, { error: 'Use application/json' }, 415); return;
      }
      const value = await body(request);
      if (url.pathname === '/api/validate' || url.pathname === '/api/plans') {
        const plan = parsePlan(value);
        const planHash = url.pathname === '/api/plans' ? await operator.store.savePlan(plan) : identity(plan);
        json(response, { plan, planHash }); return;
      }
      if (url.pathname === '/api/runs') {
        const input = z.strictObject({ plan: z.unknown(), target: targetSchema }).parse(value);
        json(response, { id: await operator.start(input.plan, input.target) }, 202); return;
      }
      if (url.pathname === '/api/cancel') {
        operator.cancel(z.strictObject({ id: z.string().uuid() }).parse(value).id);
        json(response, { cancelled: true }); return;
      }
    }
    if (request.method === 'GET') {
      if (url.pathname === '/api/devices') { json(response, await devices()); return; }
      if (url.pathname === '/api/example') {
        const path = url.searchParams.get('name') === 'fnaf' ? 'examples/fnaf2-night1-preview.json' : 'examples/fixture-toggle.json';
        json(response, JSON.parse(await readFile(path, 'utf8'))); return;
      }
      if (url.pathname === '/api/plan') { json(response, await operator.store.loadPlan(url.searchParams.get('hash') ?? '')); return; }
      if (url.pathname === '/api/run') { json(response, operator.status(url.searchParams.get('id') ?? '')); return; }
      if (url.pathname === '/api/snapshot') {
        const serial = url.searchParams.get('serial') ?? '';
        const target = ['companion','fnaf-companion'].includes(url.searchParams.get('backend')??'')
          ? new CompanionTarget(serial) : new AdbReadOnlyTarget(serial);
        const observation = await target.observe(AbortSignal.timeout(30_000));
        const { image, ...record } = observation;
        json(response, { ...record, image: image?.toString('base64') }); return;
      }
      const files: Record<string, { path: string; mime: string }> = {
        '/': { path: 'public/index.html', mime: 'text/html; charset=utf-8' },
        '/style.css': { path: 'public/style.css', mime: 'text/css' },
        '/app.js': { path: 'dist/studio/app.js', mime: 'text/javascript' },
      };
      const file = files[url.pathname];
      if (file) {
        response.writeHead(200, { 'content-type': file.mime, 'cache-control': 'no-store',
          'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
        response.end(await readFile(file.path)); return;
      }
    }
    json(response, { error: 'Rota inexistente' }, 404);
  } catch (error: unknown) {
    json(response, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
}
if (process.argv[1]?.endsWith('/server.js')) {
  const port = z.coerce.number().int().min(1024).max(65535).parse(process.env['OPERATOR_PORT'] ?? 4310);
  createStudioServer().listen(port, '127.0.0.1', () => console.log(`Android Operator Studio: http://127.0.0.1:${port}`));
}
