import { z } from 'zod';
import { parsePlan, verdictSchema } from '../core/plan.js';
import type { Plan, PlanNode, Condition, Verdict } from '../core/plan.js';

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Elemento ausente: ${id}`);
  return found;
}
function input(id: string): HTMLInputElement {
  const found = element(id);
  if (!(found instanceof HTMLInputElement)) throw new Error(`Input ausente: ${id}`);
  return found;
}
function select(id: string): HTMLSelectElement {
  const found = element(id);
  if (!(found instanceof HTMLSelectElement)) throw new Error(`Select ausente: ${id}`);
  return found;
}
function button(id: string): HTMLButtonElement {
  const found = element(id);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`Botão ausente: ${id}`);
  return found;
}
function editor(): HTMLTextAreaElement {
  const found = element('json');
  if (!(found instanceof HTMLTextAreaElement)) throw new Error('Editor ausente');
  return found;
}
async function api(path: string, value?: unknown): Promise<unknown> {
  const response = await fetch(path, value === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.error : `HTTP ${response.status}`);
  }
  return data;
}
function notice(message: string, error = false): void {
  element('notice').textContent = message;
  element('notice').classList.toggle('error', error);
}
function on(id: string, action: () => void | Promise<void>): void {
  element(id).addEventListener('click', () => { void Promise.resolve().then(action).catch(report); });
}
function report(error: unknown): void { notice(error instanceof Error ? error.message : String(error), true); }
let plan: Plan;
let selected = '';
let activeRun: string | undefined;
const names = { observe: 'OBSERVAÇÃO', tap: 'CONTATO', check: 'CONDIÇÃO', wait: 'ESPERA', routine: 'ROTINA FNAF' };
const verdicts: Verdict[] = ['PASS', 'FAIL', 'TIMEOUT', 'UNKNOWN'];
function sync(): void {
  editor().value = JSON.stringify(plan, null, 2);
  input('plan-name').value = plan.name;
  localStorage.setItem('operator-plan', JSON.stringify(plan));
  element('identity').textContent = 'Alterações locais · valide para calcular a identidade';
}
function render(): void {
  sync();
  element('node-count').textContent = `${plan.nodes.length} blocos · limite ${plan.maxSteps} etapas`;
  const container = element('nodes'); container.replaceChildren();
  for (const node of plan.nodes) {
    const card = document.createElement('button');
    card.className = `node${selected === node.id ? ' selected' : ''}`;
    card.dataset['nodeId'] = node.id;
    const top = document.createElement('span'); top.className = 'node-top';
    top.textContent = `${names[node.kind]} · ${node.id === plan.entry ? 'ENTRADA' : node.id}`;
    const title = document.createElement('span'); title.className = 'node-title'; title.textContent = node.label;
    const footer = document.createElement('span'); footer.className = 'node-footer';
    const timing = document.createElement('span'); timing.className = 'edge'; timing.textContent = `${node.deadlineMs} ms`; footer.append(timing);
    for (const [outcome, destination] of Object.entries(node.next)) {
      const edge = document.createElement('span'); edge.className = 'edge'; edge.textContent = `${outcome} → ${destination}`; footer.append(edge);
    }
    card.append(top, title, footer); card.addEventListener('click', () => { selected = node.id; render(); }); container.append(card);
  }
  inspect();
}
function field(parent: HTMLElement, label: string, value: string | number, change: (value: string) => void, type = 'text'): void {
  const wrap = document.createElement('label'); wrap.textContent = label;
  const control = document.createElement('input'); control.type = type; control.value = String(value);
  control.addEventListener('change', () => { change(control.value); render(); });
  wrap.append(control); parent.append(wrap);
}
function heading(parent: HTMLElement, title: string): void {
  const item = document.createElement('div'); item.className = 'section-label'; item.textContent = title; parent.append(item);
}
function condition(parent: HTMLElement, title: string, value: Condition): void {
  heading(parent, title);
  field(parent, 'Fato observado', value.fact, text => { value.fact = text; });
  field(parent, 'Valor esperado (texto ou JSON escalar)', String(value.equals), text => {
    const parsed = z.union([z.string(), z.number(), z.boolean()]);
    try { const data: unknown = JSON.parse(text); value.equals = parsed.parse(data); }
    catch { value.equals = text; }
  });
}
function inspect(): void {
  const parent = element('inspector'); parent.replaceChildren();
  const node = plan.nodes.find(item => item.id === selected);
  if (!node) return;
  const title = document.createElement('h3'); title.textContent = names[node.kind]; parent.append(title);
  field(parent, 'Nome do bloco', node.label, text => { node.label = text; });
  field(parent, 'Prazo da etapa (ms)', node.deadlineMs, text => { node.deadlineMs = Number(text); }, 'number');
  if (node.kind === 'tap') {
    field(parent, 'X (pixels nativos)', node.x, text => { node.x = Number(text); }, 'number');
    field(parent, 'Y (pixels nativos)', node.y, text => { node.y = Number(text); }, 'number');
    field(parent, 'Contato (ms)', node.holdMs, text => { node.holdMs = Number(text); }, 'number');
    condition(parent, 'ANTES DO CONTATO', node.before); condition(parent, 'CONFIRMAÇÃO DO EFEITO', node.after);
  }
  if (node.kind === 'check') condition(parent, 'CONDIÇÃO', node.condition);
  if (node.kind === 'wait') field(parent, 'Duração (ms)', node.durationMs, text => { node.durationMs = Number(text); }, 'number');
  heading(parent, 'SAÍDAS / LOOPS');
  for (const verdict of verdicts) {
    const label = document.createElement('label'); label.textContent = verdict;
    const control = document.createElement('select'); control.add(new Option('Encerrar com este resultado', ''));
    for (const destination of plan.nodes) control.add(new Option(destination.label, destination.id));
    control.value = node.next[verdict] ?? '';
    control.addEventListener('change', () => {
      if (control.value) node.next[verdict] = control.value; else delete node.next[verdict]; render();
    }); label.append(control); parent.append(label);
  }
  heading(parent, 'LIMITES DO PLANO');
  field(parent, 'Máximo de etapas', plan.maxSteps, text => { plan.maxSteps = Number(text); }, 'number');
  field(parent, 'Prazo total (ms)', plan.timeoutMs, text => { plan.timeoutMs = Number(text); }, 'number');
  const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = 'Excluir bloco';
  remove.disabled = plan.nodes.length === 1;
  remove.addEventListener('click', () => {
    plan.nodes = plan.nodes.filter(item => item.id !== node.id);
    for (const remaining of plan.nodes) for (const verdict of verdicts) if (remaining.next[verdict] === node.id) delete remaining.next[verdict];
    selected = plan.nodes[0]?.id ?? ''; if (plan.entry === node.id) plan.entry = selected; render();
  }); parent.append(remove);
}
function add(kind: PlanNode['kind']): void {
  const common = { id: `${kind}-${crypto.randomUUID().slice(0, 8)}`, label: names[kind], deadlineMs: 1000, next: {} };
  const node: PlanNode = kind === 'tap' ? { ...common, kind, x: 180, y: 320, holdMs: 120,
    before: { fact: 'screen', equals: 'ready' }, after: { fact: 'screen', equals: 'active' } }
    : kind === 'wait' ? { ...common, kind, durationMs: 200 }
    : kind === 'check' ? { ...common, kind, condition: { fact: 'screen', equals: 'active' } }
    : kind === 'routine' ? { ...common, kind, routine: 'fnaf2-night1-preview', deadlineMs: 30000 }
    : { ...common, kind };
  const last = plan.nodes.at(-1); if (last && !last.next.PASS) last.next.PASS = node.id;
  plan.nodes.push(node); selected = node.id; render();
}
const stepSchema = z.object({ nodeId: z.string(), kind: z.string(), verdict: verdictSchema,
  startedAtMs: z.number(), endedAtMs: z.number(), observations: z.array(z.object({ facts: z.record(z.string(), z.unknown()) }).passthrough()),
  dispatched: z.boolean(), detail: z.string(),
});
const jobSchema = z.object({ id: z.string(), status: z.enum(['RUNNING', 'DONE', 'ERROR']), error: z.string().optional(),
  result: z.object({ verdict: verdictSchema, level: z.string(), planHash: z.string(), steps: z.array(stepSchema) }).optional() });
function renderTrace(data: z.infer<typeof jobSchema>): void {
  const result = data.result; if (!result) return;
  element('run-summary').textContent = `${result.level} · ${result.verdict} · ${data.id.slice(0, 8)}`;
  const trace = element('trace'); trace.replaceChildren();
  for (const [index, step] of result.steps.entries()) {
    const row = document.createElement('div'); row.className = 'trace-row';
    const number = document.createElement('span'); number.className = 'mono'; number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span'); label.textContent = `${step.nodeId} · ${(step.endedAtMs - step.startedAtMs).toFixed(1)} ms`;
    const outcome = document.createElement('span'); outcome.className = `verdict ${step.verdict}`; outcome.textContent = step.verdict;
    const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Observações e diagnóstico';
    const content = document.createElement('pre'); content.textContent = JSON.stringify(step, null, 2); details.append(summary, content); row.append(number, label, outcome, details); trace.append(row);
  }
  if (select('target').value === 'fixture') {
    const state = result.steps.at(-1)?.observations.at(-1)?.facts['screen'];
    if (typeof state === 'string') element('fixture-state').textContent = state;
  }
}
async function run(): Promise<void> {
  parsePlan(plan);
  const selectedTarget = select('target').value;
  const target = selectedTarget === 'fixture' ? { kind: 'fixture' }
    : selectedTarget === 'fnaf-preview' ? { kind: 'fnaf-preview' }
    : selectedTarget.startsWith('companion:') ? { kind: 'fnaf-companion', serial: selectedTarget.slice(10) }
    : { kind: 'adb-readonly', serial: selectedTarget };
  const data = z.object({ id: z.string() }).parse(await api('/api/runs', { plan, target }));
  activeRun = data.id; button('run').disabled = true; button('cancel').disabled = false;
  notice('Executando com confirmação dos resultados…');
  try {
    while (true) {
      const job = jobSchema.parse(await api(`/api/run?id=${encodeURIComponent(data.id)}`));
      if (job.status === 'ERROR') throw new Error(job.error ?? 'Erro de execução');
      if (job.status === 'DONE') { renderTrace(job); notice(`Execução ${job.result?.verdict} · rastro retido em .operator/runs/${job.id}`); break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally { activeRun = undefined; button('run').disabled = false; button('cancel').disabled = true; }
}
async function snapshot(): Promise<void> {
  const serial = select('target').value;
  if (serial === 'fnaf-preview') {
    element('fixture-screen').hidden = false; element('device-image').hidden = true;
    element('fixture-state').textContent = 'dry-run';
    element('device-facts').textContent = 'FNaF · compilador e runner existentes · MODEL_ONLY · sem abrir aparelho';
    notice('Preview FNaF usa o runner existente e não abre o aparelho.'); return;
  }
  element('fixture-screen').hidden = serial !== 'fixture'; element('device-image').hidden = serial === 'fixture';
  if (serial === 'fixture') { element('device-facts').textContent = 'A fixture inicia em ready a cada execução.'; return; }
  const isCompanion = serial.startsWith('companion:');
  const data = z.object({ image: z.string(), facts: z.record(z.string(), z.unknown()), receivedAtMs: z.number() }).parse(await api(`/api/snapshot?serial=${encodeURIComponent(isCompanion ? serial.slice(10) : serial)}${isCompanion ? '&backend=fnaf-companion' : ''}`));
  const image = element('device-image'); if (image instanceof HTMLImageElement) image.src = `data:image/png;base64,${data.image}`;
  element('device-facts').textContent = JSON.stringify(data.facts, null, 2); notice('Snapshot diagnóstico recebido. Relógio da captura no aparelho: UNKNOWN.');
}
async function initialize(): Promise<void> {
  let cached: Plan | undefined;
  try { const value: unknown = JSON.parse(localStorage.getItem('operator-plan') ?? 'null'); cached = parsePlan(value); } catch { /* Use the versioned example when the draft is absent or invalid. */ }
  plan = cached ?? parsePlan(await api('/api/example')); selected = plan.entry; render();
  input('plan-name').addEventListener('change', () => { plan.name = input('plan-name').value; sync(); });
  for (const control of document.querySelectorAll('button[data-add]')) control.addEventListener('click', () => {
    const kind = control.getAttribute('data-add'); if (kind === 'observe' || kind === 'tap' || kind === 'check' || kind === 'wait' || kind === 'routine') add(kind);
  });
  for (const [id, endpoint] of [['validate', '/api/validate'], ['save', '/api/plans']]) {
    if (id && endpoint) on(id, async () => {
      const result = z.object({ planHash: z.string() }).parse(await api(endpoint, parsePlan(plan)));
      element('identity').textContent = `sha256:${result.planHash.slice(0, 20)}…`; notice(id === 'save' ? `Plano salvo · ${result.planHash}` : 'Plano válido.');
    });
  }
  on('run', run); on('cancel', async () => { if (activeRun) await api('/api/cancel', { id: activeRun }); });
  on('fnaf-example', async () => {
    plan = parsePlan(await api('/api/example?name=fnaf')); selected = plan.entry;
    select('target').value = 'fnaf-preview'; render(); await snapshot(); notice('Plano FNaF carregado. A rotina usa o compilador e o runner existentes em dry-run.');
  });
  on('json-toggle', () => { element('json-panel').hidden = !element('json-panel').hidden; sync(); });
  on('apply-json', () => { const value: unknown = JSON.parse(editor().value); plan = parsePlan(value); selected = plan.entry; render(); notice('Artefato aplicado ao editor.'); });
  on('export', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(parsePlan(plan), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'operator-plan.json'; link.click(); URL.revokeObjectURL(url);
  });
  input('import').addEventListener('change', () => { void (async () => {
    const file = input('import').files?.[0]; if (!file) return;
    const value: unknown = JSON.parse(await file.text()); plan = parsePlan(value); selected = plan.entry; render(); notice('Plano importado.');
  })().catch(report); });
  on('refresh-devices', async () => {
    const list = z.array(z.object({ serial: z.string(), model: z.string(), state: z.string() })).parse(await api('/api/devices'));
    const target = select('target'); target.replaceChildren(new Option('Fixture · botão simulado', 'fixture'), new Option('FNaF · campanha dry-run', 'fnaf-preview'));
    for (const device of list) if (device.state === 'device') {
      target.add(new Option(`${device.model} · Companion FNaF`, `companion:${device.serial}`));
      target.add(new Option(`${device.model} · ADB diagnóstico`, device.serial));
    }
    notice(`${list.filter(device => device.state === 'device').length} celular(es) disponível(is).`);
  });
  on('snapshot', snapshot); select('target').addEventListener('change', () => { void snapshot().catch(report); });
  notice('Workspace pronto. Execute a fixture para verificar o primeiro fluxo.');
}
void initialize().catch(report);
