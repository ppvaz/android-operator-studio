import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { execute } from './core/runtime.js';
import type { RunResult } from './core/runtime.js';
import { parsePlan } from './core/plan.js';
import { hash } from './core/identity.js';
import type { Plan } from './core/plan.js';
import { Store } from './core/store.js';
import { FixtureTarget } from './device/fixture.js';
import { AdbReadOnlyTarget } from './device/adb.js';
import { FnafPreviewTarget, FnafCompanionTarget, configuredFnafRoot } from './device/fnaf.js';

export const targetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('fixture') }),
  z.strictObject({ kind: z.literal('fnaf-preview') }),
  z.strictObject({ kind: z.literal('fnaf-companion'), serial: z.string().regex(/^[a-zA-Z0-9_.:-]{1,96}$/) }),
  z.strictObject({ kind: z.literal('adb-readonly'), serial: z.string().regex(/^[a-zA-Z0-9_.:-]{1,128}$/) }),
]);
export type TargetSelection = z.infer<typeof targetSchema>;
interface Job { id: string; status: 'RUNNING' | 'DONE' | 'ERROR'; result?: RunResult; error?: string; controller: AbortController }
export class Operator {
  readonly store: Store;
  private readonly jobs = new Map<string, Job>();
  private busy = false;
  constructor(root?: string) { this.store = new Store(root); }
  async start(input: unknown, selection: TargetSelection): Promise<string> {
    const plan = parsePlan(input);
    selection = targetSchema.parse(selection);
    if (this.busy) throw new Error('Já existe uma execução ativa');
    if (selection.kind !== 'fixture' && plan.nodes.some(node => node.kind === 'tap'))
      throw new Error('Plano contém contato; backend Android inicial é somente leitura');
    this.busy = true;
    const id = randomUUID();
    const job: Job = { id, status: 'RUNNING', controller: new AbortController() };
    this.jobs.set(id, job);
    // Keep memory bounded; persisted runs remain available on disk.
    if (this.jobs.size > 50) for (const [oldId, old] of this.jobs) {
      if (old.status !== 'RUNNING') { this.jobs.delete(oldId); break; }
    }
    void this.run(job, plan, selection);
    return id;
  }
  private async run(job: Job, plan: Plan, selection: TargetSelection): Promise<void> {
    try {
      await this.store.savePlan(plan);
      const target = selection.kind === 'fixture' ? new FixtureTarget()
        : selection.kind === 'fnaf-preview' ? new FnafPreviewTarget(configuredFnafRoot())
        : selection.kind === 'fnaf-companion' ? new FnafCompanionTarget(configuredFnafRoot(), selection.serial)
        : new AdbReadOnlyTarget(selection.serial);
      const result = await execute(plan, target, job.controller.signal, job.id);
      await this.store.saveRun(result);
      job.result = result;
      job.status = 'DONE';
    } catch (error: unknown) {
      job.error = error instanceof Error ? error.message : String(error);
      job.status = 'ERROR';
    } finally { this.busy = false; }
  }
  status(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Execução inexistente nesta sessão');
    const result = job.result ? { ...job.result, steps: job.result.steps.map(step => ({ ...step,
      observations: step.observations.map(observation => {
        const { image, ...record } = observation;
        return image ? { ...record, imageSha256: hash(image) } : record;
      }),
    })) } : undefined;
    return { id, status: job.status, result, error: job.error };
  }
  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Execução inexistente');
    job.controller.abort(new Error('Parada solicitada pelo operador'));
  }
}
