import { readFile } from 'node:fs/promises';
import { parsePlan } from './core/plan.js';
import { identity } from './core/identity.js';
import { execute } from './core/runtime.js';
import { FixtureTarget } from './device/fixture.js';
import { Store } from './core/store.js';
import { FnafPreviewTarget, configuredFnafRoot } from './integrations/fnaf.js';

const [command, path, backend] = process.argv.slice(2);
if (!path || (command !== 'validate' && command !== 'run')) {
  console.error('Uso: node dist/cli.js <validate|run> <plano.json> (run usa FIXTURE)');
  process.exitCode = 2;
} else {
  try {
    const value: unknown = JSON.parse(await readFile(path, 'utf8'));
    const plan = parsePlan(value);
    if (command === 'validate') console.log(JSON.stringify({ planHash: identity(plan), nodes: plan.nodes.length }, null, 2));
    else {
      const controller = new AbortController();
      process.once('SIGINT', () => controller.abort());
      const store = new Store();
      await store.savePlan(plan);
      const target = backend === 'fnaf-preview' ? new FnafPreviewTarget(configuredFnafRoot()) : new FixtureTarget();
      const result = await execute(plan, target, controller.signal);
      await store.saveRun(result);
      console.log(JSON.stringify(result, null, 2));
      if (result.verdict !== 'PASS') process.exitCode = 1;
    }
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
