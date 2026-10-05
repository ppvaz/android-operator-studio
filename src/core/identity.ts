import { createHash } from 'node:crypto';
import { parsePlan } from './plan.js';
import type { Plan } from './plan.js';
export function hash(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}
export function identity(plan: Plan): string { return hash(JSON.stringify(parsePlan(plan))); }
