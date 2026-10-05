import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { parsePlan } from './plan.js';
import { identity } from './identity.js';
import type { Plan, PlanNode, Verdict } from './plan.js';
import { evaluate } from './port.js';
import type { ClaimLevel, Observation, Target } from './port.js';

export interface StepTrace {
  nodeId: string; kind: PlanNode['kind']; verdict: Verdict;
  startedAtMs: number; endedAtMs: number; clock: 'host-monotonic';
  observations: Observation[]; dispatched: boolean; detail: string;
}
export interface RunResult {
  schema: 'operator-run/v1'; id: string; planHash: string; target: string;
  level: ClaimLevel; verdict: Verdict; startedAt: string; steps: StepTrace[];
}
async function step(node: PlanNode, target: Target, signal: AbortSignal, trace: StepTrace): Promise<Verdict> {
  const observe = async () => {
    const observation = await target.observe(signal);
    signal.throwIfAborted();
    trace.observations.push(observation);
    return observation;
  };
  switch (node.kind) {
    case 'observe': await observe(); return 'PASS';
    case 'wait': await sleep(node.durationMs, undefined, { signal }); return 'PASS';
    case 'check': return evaluate(node.condition, await observe());
    case 'routine': {
      if (!target.routine) { trace.detail = 'Rotina não suportada neste backend'; return 'UNKNOWN'; }
      const observation = await target.routine(node.routine, signal);
      signal.throwIfAborted(); trace.observations.push(observation);
      return 'PASS';
    }
    case 'tap': {
      const before = evaluate(node.before, await observe());
      if (before !== 'PASS') { trace.detail = 'Precondição não confirmada'; return before; }
      await target.tap(node.x, node.y, node.holdMs, signal);
      trace.dispatched = true;
      // The transport response is deliberately not a PASS. Observe the target.
      while (true) {
        const after = evaluate(node.after, await observe());
        if (after === 'PASS' || after === 'UNKNOWN') return after;
        await sleep(25, undefined, { signal });
      }
    }
  }
}
async function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(signal.reason);
    signal.addEventListener('abort', rejectAbort, { once: true });
  });
  try { return await Promise.race([work, aborted]); }
  finally { if (rejectAbort) signal.removeEventListener('abort', rejectAbort); }
}
export async function execute(input: Plan, target: Target, external = new AbortController().signal, runId: string = randomUUID()): Promise<RunResult> {
  const plan = parsePlan(input);
  const result: RunResult = { schema: 'operator-run/v1', id: runId, planHash: identity(plan),
    target: target.name, level: target.level, verdict: 'UNKNOWN', startedAt: new Date().toISOString(), steps: [] };
  const deadline = performance.now() + plan.timeoutMs;
  let current: string | undefined = plan.entry;
  for (let count = 0; current; count++) {
    if (external.aborted) { result.verdict = 'CANCELLED'; break; }
    if (performance.now() >= deadline || count >= plan.maxSteps) { result.verdict = 'TIMEOUT'; break; }
    const node = plan.nodes.find(item => item.id === current);
    if (!node) throw new Error(`Nó inexistente: ${current}`);
    const budget = Math.min(node.deadlineMs, deadline - performance.now());
    const controller = new AbortController();
    const signal = AbortSignal.any([external, controller.signal]);
    const timer = setTimeout(() => controller.abort(new Error('Deadline excedido')), budget);
    const trace: StepTrace = { nodeId: node.id, kind: node.kind, verdict: 'UNKNOWN',
      startedAtMs: performance.now(), endedAtMs: 0, clock: 'host-monotonic', observations: [], dispatched: false, detail: '' };
    try {
      trace.verdict = await bounded(step(node, target, signal, trace), signal);
      if (performance.now() > trace.startedAtMs + budget) trace.verdict = 'TIMEOUT';
    } catch (error: unknown) {
      trace.verdict = external.aborted ? 'CANCELLED' : controller.signal.aborted ? 'TIMEOUT' : 'UNKNOWN';
      trace.detail = error instanceof Error ? error.message : String(error);
    } finally { clearTimeout(timer); trace.endedAtMs = performance.now(); }
    result.steps.push(trace);
    result.verdict = trace.verdict;
    if (trace.verdict === 'CANCELLED' || performance.now() >= deadline) break;
    current = node.next[trace.verdict];
  }
  return result;
}
