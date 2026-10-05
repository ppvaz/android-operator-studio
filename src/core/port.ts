import type { Condition, Verdict } from './plan.js';

export type Fact = string | number | boolean;
export type ClaimLevel = 'FIXTURE' | 'DEVICE_MEASURED' | 'MODEL_ONLY';
export interface Observation {
  id: string;
  receivedAtMs: number;
  clock: 'host-monotonic';
  facts: Record<string, Fact>;
  image?: Buffer;
  evidence?: Record<string, unknown>;
}
export interface Target {
  readonly name: string;
  readonly level: ClaimLevel;
  observe(signal: AbortSignal): Promise<Observation>;
  tap(x: number, y: number, holdMs: number, signal: AbortSignal): Promise<void>;
  routine?(name: 'fnaf2-night1-preview', signal: AbortSignal): Promise<Observation>;
}
export function evaluate(condition: Condition, observation: Observation): Verdict {
  const actual = observation.facts[condition.fact];
  return actual === undefined ? 'UNKNOWN' : actual === condition.equals ? 'PASS' : 'FAIL';
}
