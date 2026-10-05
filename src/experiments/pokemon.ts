// Bounded research operations. This is not the production Android action adapter.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { hash } from '../core/identity.js';
import { configuredFnafRoot, FNAF_FILES, inspectFnaf } from '../device/fnaf.js';

const exec = promisify(execFile);
const root = resolve('.operator/experiments/pokemon-20261005');
await mkdir(root, { recursive: true });
const client = new Client({ name: 'pokemon-experiment', version: '0.1.0' });
const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
const fnaf = configuredFnafRoot();
const source = await inspectFnaf(fnaf);
source.sources['packages/play/bin/companion/companion-setup.py'] = hash(await readFile(join(fnaf, 'packages/play/bin/companion/companion-setup.py')));
const harnessSha256 = hash(await readFile('src/experiments/pokemon.ts'));
const protocolSha256 = hash(await readFile('docs/experiments/POKEMON-20261005.protocol.json'));
await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('dist/mcp.js')], env }));
const replySchema = z.object({ isError: z.boolean().optional(), content: z.array(z.object({ type: z.string(), text: z.string().optional(), data: z.string().optional() })) });
function parsed(value: unknown): unknown {
  const reply = replySchema.parse(value);
  if (reply.isError) throw new Error(reply.content.find(item => item.type === 'text')?.text ?? 'MCP error');
  const text = reply.content.find(item => item.type === 'text')?.text;
  if (!text) throw new Error('MCP reply has no text');
  const result: unknown = JSON.parse(text); return result;
}
const devices = z.array(z.object({ serial: z.string(), model: z.string(), state: z.string() })).parse(parsed(await client.callTool({ name: 'devices_list', arguments: {} })));
const active = devices.filter(device => device.state === 'device');
if (active.length !== 1) { await client.close(); throw new Error('Experiment requires exactly one connected authorized device'); }
const device = active[0]; if (!device) throw new Error('Device missing');
const serial = device.serial;
const deviceId = hash(serial).slice(0, 16);
const packageName = 'com.fastemulator.gbc';
const [verb, label, parameter] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]{1,64}$/.test(label)) { await client.close(); throw new Error('Use a unique lowercase evidence label'); }
const adb = (...args: string[]) => exec('adb', ['-s', serial, ...args], { timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
async function leased(args: string[]) {
  return exec('python3', [join(fnaf, FNAF_FILES.lease), serial, '--', ...args], {
    cwd: fnaf, timeout: 30000, maxBuffer: 4 * 1024 * 1024,
  });
}
async function foreground() {
  const result = await adb('shell', 'dumpsys', 'activity', 'activities');
  return /(?:topResumedActivity|mResumedActivity)[^\n]*?\s([a-zA-Z0-9_.]+)\//.exec(result.stdout)?.[1] ?? 'UNKNOWN';
}
async function snapshot(backend: 'adb-readonly' | 'fnaf-companion', suffix: string) {
  const raw = await client.callTool({ name: 'device_observe', arguments: { serial, backend } });
  const reply = replySchema.parse(raw);
  const observation = parsed(raw);
  await writeFile(join(root, `${label}-${suffix}.json`), JSON.stringify(observation, null, 2));
  for (const item of reply.content) if (item.type === 'image' && item.data) {
    await writeFile(join(root, `${label}-${suffix}.png`), Buffer.from(item.data, 'base64'));
  }
  return observation;
}
async function launch() {
  const resolved = await adb('shell', 'cmd', 'package', 'resolve-activity', '--brief', packageName);
  const component = resolved.stdout.trim().split('\n').find(line => line.startsWith(`${packageName}/`));
  if (!component || !/^[A-Za-z0-9_.$/]+$/.test(component)) throw new Error('No valid installed emulator launcher');
  const result = await leased(['adb', '-s', serial, 'shell', 'am', 'start', '-W', '-n', component, '-f', '0x10200000']);
  return { component, launchOutput: result.stdout.trim(), foregroundPackage: await foreground(), observation: await snapshot('adb-readonly', 'after') };
}
async function ui() {
  await leased(['adb', '-s', serial, 'shell', 'uiautomator', 'dump', '/sdcard/operator-pokemon-ui.xml']);
  const result = await adb('exec-out', 'cat', '/sdcard/operator-pokemon-ui.xml');
  await writeFile(join(root, `${label}.xml`), result.stdout);
  return result.stdout;
}
const startedAt = new Date().toISOString(); const startedMs = performance.now();
let outcome: unknown;
try {
  if (verb === 'inspect') {
    const [emulator, companion, projection, activity] = await Promise.all([
      adb('shell', 'dumpsys', 'package', packageName), adb('shell', 'dumpsys', 'package', 'com.ppvaz.fnafcompanion'),
      adb('shell', 'dumpsys', 'media_projection'), foreground(),
    ]);
    const build = (text: string) => ({ versionCode: /\bversionCode=(\d+)/.exec(text)?.[1] ?? 'UNKNOWN', versionName: /\bversionName=(\S+)/.exec(text)?.[1] ?? 'UNKNOWN' });
    outcome = { emulator: build(emulator.stdout), companion: build(companion.stdout), foregroundPackage: activity,
      projectionActive: projection.stdout.includes('com.ppvaz.fnafcompanion') && projection.stdout.includes('TYPE_SCREEN_CAPTURE') };
  } else if (verb === 'snapshot') {
    outcome = await snapshot(parameter === 'native' ? 'fnaf-companion' : 'adb-readonly', 'frame');
  } else if (verb === 'launch') {
    outcome = await launch();
  } else if (verb === 'ui') {
    const xml = await ui();
    outcome = { xmlSha256: hash(xml), foregroundPackage: await foreground() };
  } else if (verb === 'select-rom') {
    if (await foreground() !== packageName) throw new Error('ROM selection requires emulator foreground');
    const xml = await ui();
    if (!xml.includes('resource-id="com.fastemulator.gbc:id/rom_list"')) throw new Error('No semantic ROM list');
    const node = [...xml.matchAll(/<node\b[^>]*>/g)].map(match => match[0]).find(text => text.includes('text="Pokemon Red"') && text.includes(`package="${packageName}"`) && text.includes('enabled="true"'));
    const bounds = node && /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
    if (!bounds) throw new Error('Pokemon Red row not observed');
    const x = Math.floor((Number(bounds[1]) + Number(bounds[3])) / 2);
    const y = Math.floor((Number(bounds[2]) + Number(bounds[4])) / 2);
    await leased(['adb', '-s', serial, 'shell', 'input', 'tap', String(x), String(y)]);
    await new Promise(resolve => setTimeout(resolve, 700));
    outcome = { namedControl: 'Pokemon Red', uiSha256: hash(xml), x, y, observation: await snapshot('adb-readonly', 'after') };
  } else if (verb === 'prepare-capture') {
    const helper = join(fnaf, 'packages/play/bin/companion/companion-setup.py');
    const code = 'import importlib.util,sys; spec=importlib.util.spec_from_file_location("original_setup",sys.argv[1]); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); module.start_capture("")';
    const result = await leased(['env', `ANDROID_SERIAL=${serial}`, 'python3', '-c', code, helper]);
    outcome = { existingSetupOutput: result.stdout.trim(), observation: await snapshot('adb-readonly', 'after') };
  } else if (verb === 'stop-capture') {
    const helper = join(fnaf, 'packages/play/bin/companion/companion-setup.py');
    const code = 'import importlib.util,sys; spec=importlib.util.spec_from_file_location("original_setup",sys.argv[1]); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); module.stop_capture()';
    const result = await leased(['env', `ANDROID_SERIAL=${serial}`, 'python3', '-c', code, helper]);
    outcome = { existingSetupOutput: result.stdout.trim(), foregroundPackage: await foreground() };
  } else if (verb === 'home') {
    if (await foreground() !== packageName) throw new Error('Home trial requires emulator foreground');
    const before = await snapshot('adb-readonly', 'before');
    await leased(['adb', '-s', serial, 'shell', 'input', 'keyevent', 'KEYCODE_HOME']);
    outcome = { before, foregroundPackage: await foreground(), after: await snapshot('adb-readonly', 'after') };
  } else if (verb === 'menu-contact') {
    const review = z.object({ approvedForReplay: z.boolean(), reason: z.string() }).parse(JSON.parse(await readFile('docs/experiments/POKEMON-20261005.controls-review.json', 'utf8')));
    if (!review.approvedForReplay) throw new Error(`Control binding refused: ${review.reason}`);
    const selected = /^(Start|B):(20|150)$/.exec(parameter ?? '');
    if (!selected) throw new Error('Only Start/B at nominal 20 or 150 ms');
    const profileText = await readFile('docs/experiments/POKEMON-20261005.controls.json', 'utf8');
    const profile = z.object({ geometry: z.object({ width: z.number(), height: z.number() }),
      controls: z.object({ Start: z.object({ x: z.number().int(), y: z.number().int() }), B: z.object({ x: z.number().int(), y: z.number().int() }) }) }).parse(JSON.parse(profileText));
    const before = z.object({ facts: z.object({ foregroundPackage: z.literal('com.fastemulator.gbc'), width: z.literal(1080), height: z.literal(2400) }) }).passthrough().parse(await snapshot('adb-readonly', 'before'));
    if (profile.geometry.width !== before.facts.width || profile.geometry.height !== before.facts.height) throw new Error('Geometry drift');
    const control = selected[1] === 'Start' ? 'Start' : 'B';
    const point = profile.controls[control];
    await leased(['adb', '-s', serial, 'shell', 'input', 'swipe', String(point.x), String(point.y), String(point.x), String(point.y), selected[2] ?? '150']);
    await new Promise(resolve => setTimeout(resolve, 350));
    outcome = { control, nominalHoldMs: Number(selected[2]), point, profileSha256: hash(profileText),
      dispatchAccepted: true, gameAcceptance: 'UNKNOWN until visual review', inputBackend: 'diagnostic-adb-stationary-swipe',
      guardScope: 'foreground and physical geometry; semantic game state reviewed by agent',
      before, after: await snapshot('fnaf-companion', 'after') };
  } else if (verb === 'guard') {
    const fact = parameter === 'unknown' ? 'pokemonOverworld' : 'foregroundPackage';
    const plan = { schema: 'operator-plan/v1', name: `Pokemon guard ${fact}`, entry: 'check', maxSteps: 1, timeoutMs: 10000,
      nodes: [{ id: 'check', label: 'Verify observed precondition', kind: 'check', deadlineMs: 8000, next: {}, condition: { fact, equals: fact === 'foregroundPackage' ? packageName : true } }] };
    const run = z.object({ id: z.string() }).parse(parsed(await client.callTool({ name: 'run_start', arguments: { plan, target: { kind: 'adb-readonly', serial } } })));
    for (let i = 0; i < 100; i++) {
      const status = z.object({ status: z.string() }).passthrough().parse(parsed(await client.callTool({ name: 'run_status', arguments: { id: run.id } })));
      if (status.status !== 'RUNNING') { outcome = { plan, run: status }; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!outcome) throw new Error('Guard run did not complete');
  } else if (verb === 'native-plan') {
    const plan: unknown = JSON.parse(await readFile('examples/pokemon-native-observe.json', 'utf8'));
    const run = z.object({ id: z.string() }).parse(parsed(await client.callTool({ name: 'run_start', arguments: { plan, target: { kind: 'fnaf-companion', serial } } })));
    for (let i = 0; i < 300; i++) {
      const status = z.object({ status: z.string() }).passthrough().parse(parsed(await client.callTool({ name: 'run_status', arguments: { id: run.id } })));
      if (status.status !== 'RUNNING') { outcome = { plan, run: status }; break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!outcome) throw new Error('Native plan did not complete');
  } else if (verb === 'reject-contact') {
    const plan = { schema: 'operator-plan/v1', name: 'Refuse unqualified Android contact', entry: 'tap', maxSteps: 1, timeoutMs: 1000,
      nodes: [{ id: 'tap', kind: 'tap', label: 'Contact must be refused before starting a run', deadlineMs: 500, next: {}, x: 0, y: 0, holdMs: 20,
        before: { fact: 'foregroundPackage', equals: packageName }, after: { fact: 'pokemonOverworld', equals: true } }] };
    const reply = replySchema.parse(await client.callTool({ name: 'run_start', arguments: { plan, target: { kind: 'adb-readonly', serial } } }));
    if (!reply.isError) throw new Error('Expected explicit Android contact refusal');
    const detail = reply.content.find(item => item.type === 'text')?.text;
    if (!detail?.includes('somente leitura')) throw new Error(`Unexpected refusal: ${detail}`);
    outcome = { plan, expectedRefusal: detail, scope: 'MCP admission control, no run started; not an input-acceptance experiment' };
  } else {
    throw new Error('Closed verbs: inspect | snapshot | launch | ui | select-rom | prepare-capture | stop-capture | home | menu-contact | guard | native-plan | reject-contact');
  }
  const record = { schema: 'operator-pokemon-operation/v1', startedAt, hostElapsedMs: performance.now() - startedMs,
    clock: 'host-monotonic', label, verb, parameter, deviceId, model: device.model, source, harnessSha256, protocolSha256, outcome };
  await writeFile(join(root, `${label}-operation.json`), JSON.stringify(record, null, 2));
  await appendFile(join(root, 'events.jsonl'), JSON.stringify(record) + '\n');
  console.log(JSON.stringify(record));
} catch (error: unknown) {
  const detail = (error instanceof Error ? error.message : String(error)).replaceAll(serial, `device:${deviceId}`);
  const record = { schema: 'operator-pokemon-operation/v1', startedAt, hostElapsedMs: performance.now() - startedMs,
    clock: 'host-monotonic', label, verb, parameter, deviceId, source, harnessSha256, protocolSha256, error: detail };
  await writeFile(join(root, `${label}-operation.json`), JSON.stringify(record, null, 2));
  await appendFile(join(root, 'events.jsonl'), JSON.stringify(record) + '\n');
  console.log(JSON.stringify(record)); process.exitCode = 1;
} finally { await client.close(); }
