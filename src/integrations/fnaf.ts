import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import {hash} from '../core/identity.js';
import type {Target,Observation} from '../core/port.js';
import {inspectFnaf,FNAF_FILES} from '../device/fnaf.js';
export {fnafIntegrationCheckout as configuredFnafRoot} from '../config.js';
const exec=promisify(execFile);
export class FnafPreviewTarget implements Target {
  readonly name = 'fnaf-existing-campaign-preview';
  readonly level = 'MODEL_ONLY';
  private previewed = false;
  constructor(private readonly root: string) {}
  async observe(signal: AbortSignal): Promise<Observation> {
    signal.throwIfAborted(); const provenance = await inspectFnaf(this.root); signal.throwIfAborted();
    return { id: hash(JSON.stringify(provenance)), clock: 'host-monotonic', receivedAtMs: performance.now(),
      facts: { integrationReady: true, campaignDryRun: this.previewed, sourceRevision: provenance.revision,
        sourceHash: hash(JSON.stringify(provenance.sources)), deviceOpened: false } };
  }
  async tap(): Promise<never> { throw new Error('Preview FNaF não opera o aparelho'); }
  async routine(_name: 'fnaf2-night1-preview', signal: AbortSignal): Promise<Observation> {
    const directory = await mkdtemp(join(tmpdir(), 'operator-fnaf-'));
    try {
      await exec(process.execPath, [FNAF_FILES.emit, '--winner', FNAF_FILES.winner, '--out', directory], {
        cwd: this.root, signal, timeout: 20_000, maxBuffer: 2 * 1024 * 1024,
      });
      const campaign = await exec(process.execPath, [FNAF_FILES.campaign, 'campaign', '--bundle', directory,
        '--nights', '1', '--profile', 'hid-mediaprojection', '--dry-run', '--json'], {
        cwd: this.root, signal, timeout: 20_000, maxBuffer: 4 * 1024 * 1024,
      });
      const value: unknown = JSON.parse(campaign.stdout);
      // The existing runner's machine-readable contract proves this is a dry run.
      const summary = z.object({ status: z.literal('READY'), mode: z.literal('dry-run') }).passthrough().parse(value);
      signal.throwIfAborted(); this.previewed = true;
      const observation = await this.observe(signal);
      observation.facts['campaignReportHash'] = hash(JSON.stringify(summary));
      const manifest: unknown = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      observation.evidence = { campaign: summary, bundleManifest: manifest, provenance: await inspectFnaf(this.root) };
      return observation;
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
