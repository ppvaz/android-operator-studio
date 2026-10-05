import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parsePlan } from './plan.js';
import { hash, identity } from './identity.js';
import type { Plan } from './plan.js';
import type { RunResult } from './runtime.js';

export class Store {
  constructor(readonly root = '.operator') {}
  async savePlan(plan: Plan): Promise<string> {
    const planHash = identity(plan);
    await mkdir(join(this.root, 'plans'), { recursive: true });
    await writeFile(join(this.root, 'plans', `${planHash}.json`), JSON.stringify(plan, null, 2) + '\n');
    return planHash;
  }
  async loadPlan(planHash: string): Promise<Plan> {
    if (!/^[a-f0-9]{64}$/.test(planHash)) throw new Error('Hash inválido');
    const value: unknown = JSON.parse(await readFile(join(this.root, 'plans', `${planHash}.json`), 'utf8'));
    return parsePlan(value);
  }
  async saveRun(result: RunResult): Promise<void> {
    const directory = join(this.root, 'runs', result.id);
    await mkdir(join(directory, 'frames'), { recursive: true });
    const steps = [];
    for (const step of result.steps) {
      const observations = [];
      for (const observation of step.observations) {
        const { image, ...record } = observation;
        if (image) {
          const imageSha256 = hash(image);
          await writeFile(join(directory, 'frames', `${imageSha256}.png`), image);
          observations.push({ ...record, imageSha256 });
        } else observations.push(record);
      }
      steps.push({ ...step, observations });
    }
    await writeFile(join(directory, 'result.json'), JSON.stringify({ ...result, steps }, null, 2) + '\n');
  }
}
