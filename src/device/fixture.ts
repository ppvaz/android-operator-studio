import { performance } from 'node:perf_hooks';
import type { Observation, Target } from '../core/port.js';

export class FixtureTarget implements Target {
  readonly name = 'fixture-toggle';
  readonly level = 'FIXTURE';
  private state = 'ready';
  private sequence = 0;
  async observe(signal: AbortSignal): Promise<Observation> {
    signal.throwIfAborted();
    return { id: `fixture-${++this.sequence}`, clock: 'host-monotonic',
      receivedAtMs: performance.now(), facts: { screen: this.state, width: 360, height: 640 } };
  }
  async tap(x: number, y: number, holdMs: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    if (holdMs < 1 || x < 0 || x >= 360 || y < 0 || y >= 640) throw new Error('Contato fora da fixture');
    if (x >= 80 && x <= 280 && y >= 240 && y <= 400)
      this.state = this.state === 'ready' ? 'active' : 'ready';
  }
}
