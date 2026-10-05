import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { hash } from '../core/identity.js';
import type { Target, Observation } from '../core/port.js';

const exec = promisify(execFile);
export const FNAF_FILES = {
  emit: 'packages/propose/bin/plans/emit.ts',
  campaign: 'apps/desktop/src/device-cli.ts',
  winner: 'packages/propose/bindings/fnaf2/campaign-night1-minimal-winner.json',
  snap: 'packages/play/bin/phone/native-frame.ts',
  lease: 'packages/play/src/safety/device-lock-exec.py',
};
export function configuredFnafRoot(): string {
  const root = process.env['OPERATOR_FNAF_ROOT'];
  if (!root) throw new Error('Configure OPERATOR_FNAF_ROOT com o checkout do fnaf2-1020 (npm ci instalado)');
  return resolve(root);
}
export async function inspectFnaf(root: string) {
  const sources: Record<string, string> = {};
  for (const path of Object.values(FNAF_FILES)) sources[path] = hash(await readFile(join(root, path)));
  await access(join(root, 'node_modules', '@sixam', 'play'));
  const revision = await exec('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 5000 });
  return { revision: revision.stdout.trim(), sources };
}
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
export class FnafCompanionTarget implements Target {
  readonly name: string;
  readonly level = 'DEVICE_MEASURED';
  constructor(private readonly root: string, private readonly serial: string) {
    if (!/^[a-zA-Z0-9_.:-]{1,96}$/.test(serial)) throw new Error('Serial inválido');
    this.name = `fnaf-companion:${hash(serial).slice(0, 16)}`;
  }
  async observe(signal: AbortSignal): Promise<Observation> {
    const directory = await mkdtemp(join(tmpdir(), 'operator-native-'));
    try {
      // Invoke the original capture through its original cross-checkout lease.
      // The marker goes to the child only inside the genuine lease holder.
      const result = await exec('python3', [FNAF_FILES.lease, this.serial, '--', 'env',
        'FNAF_LEASE_HELD=1', `FNAF_SERIAL=${this.serial}`, process.execPath,
        FNAF_FILES.snap, '--out', join(directory, 'frame.png'), '--label', 'operator-studio'], {
        cwd: this.root, signal, timeout: 25_000, maxBuffer: 1024 * 1024,
      });
      const metadata: unknown = JSON.parse(result.stdout);
      const snapshot = z.object({ imageNs: z.string().regex(/^\d+$/), snapshotNs: z.string().regex(/^\d+$/), bytes: z.number() }).parse(metadata);
      const image = await readFile(join(directory, 'frame.png')); signal.throwIfAborted();
      if (image.length < 24 || image.readUInt32BE(12) !== 0x49484452) throw new Error('SNAP retornou PNG inválido');
      return { id: hash(image), clock: 'host-monotonic', receivedAtMs: performance.now(), image,
        facts: { width: image.readUInt32BE(16), height: image.readUInt32BE(20), frameSha256: hash(image),
          deviceImageNs: snapshot.imageNs, deviceSnapshotNs: snapshot.snapshotNs, deviceClock: 'companion-System.nanoTime',
          backend: 'fnaf-companion-native-snap', clockMap: 'UNKNOWN' } };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async tap(): Promise<never> { throw new Error('Contatos permanecem nos runners qualificados do FNaF'); }
}
