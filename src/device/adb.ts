import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { hash } from '../core/identity.js';
import type { Observation, Target } from '../core/port.js';

const exec = promisify(execFile);
export interface DeviceInfo { serial: string; model: string; state: string }
export async function devices(): Promise<DeviceInfo[]> {
  const result = await exec('adb', ['devices', '-l'], { timeout: 5000, maxBuffer: 256_000 });
  return result.stdout.split('\n').slice(1).flatMap(line => {
    const words = line.trim().split(/\s+/);
    const serial = words[0], state = words[1];
    if (!serial || !state) return [];
    return [{ serial, state, model: words.find(word => word.startsWith('model:'))?.slice(6) ?? 'UNKNOWN' }];
  });
}
export class AdbReadOnlyTarget implements Target {
  readonly name: string;
  readonly level = 'DEVICE_MEASURED';
  constructor(private readonly serial: string) {
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(serial)) throw new Error('Serial inválido');
    this.name = `adb-readonly:${serial}`;
  }
  async observe(signal: AbortSignal): Promise<Observation> {
    signal.throwIfAborted();
    const screenshot = await exec('adb', ['-s', this.serial, 'exec-out', 'screencap', '-p'], {
      encoding: 'buffer', timeout: 5000, maxBuffer: 32 * 1024 * 1024, signal,
    });
    const receivedAtMs = performance.now();
    const image = screenshot.stdout;
    if (image.length < 24 || !image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
      throw new Error('Captura PNG inválida');
    const activity = await exec('adb', ['-s', this.serial, 'shell', 'dumpsys', 'activity', 'activities'], {
      timeout: 5000, maxBuffer: 4 * 1024 * 1024, signal,
    });
    const foreground = /(?:topResumedActivity|mResumedActivity)[^\n]*?\s([a-zA-Z0-9_.]+)\//.exec(activity.stdout)?.[1];
    const facts: Observation['facts'] = { width: image.readUInt32BE(16), height: image.readUInt32BE(20), frameSha256: hash(image) };
    if (foreground) facts['foregroundPackage'] = foreground;
    // Package and screenshot are sequential witnesses, not an atomic frame.
    return { id: hash(image), clock: 'host-monotonic', receivedAtMs, facts, image };
  }
  async tap(): Promise<never> {
    throw new Error('Backend Android somente leitura; contatos ainda não qualificados');
  }
}
