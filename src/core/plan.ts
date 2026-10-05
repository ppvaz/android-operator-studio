import { z } from 'zod';

export const verdictSchema = z.enum(['PASS', 'FAIL', 'TIMEOUT', 'UNKNOWN', 'CANCELLED']);
export type Verdict = z.infer<typeof verdictSchema>;
export const conditionSchema = z.strictObject({
  fact: z.string().min(1).max(100), equals: z.union([z.string(), z.number().finite(), z.boolean()]),
});
export type Condition = z.infer<typeof conditionSchema>;
const transitions = z.strictObject({
  PASS: z.string().optional(), FAIL: z.string().optional(), TIMEOUT: z.string().optional(),
  UNKNOWN: z.string().optional(), CANCELLED: z.string().optional(),
});
const common = {
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), label: z.string().min(1).max(100),
  deadlineMs: z.number().int().min(1).max(30_000), next: transitions,
};
export const nodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...common, kind: z.literal('observe') }),
  z.strictObject({ ...common, kind: z.literal('wait'), durationMs: z.number().int().min(0).max(30_000) }),
  z.strictObject({ ...common, kind: z.literal('check'), condition: conditionSchema }),
  z.strictObject({ ...common, kind: z.literal('routine'), routine: z.literal('fnaf2-night1-preview') }),
  z.strictObject({ ...common, kind: z.literal('tap'),
    x: z.number().int().min(0).max(10_000), y: z.number().int().min(0).max(10_000),
    holdMs: z.number().int().min(1).max(5000),
    before: conditionSchema, after: conditionSchema,
  }),
]);
export type PlanNode = z.infer<typeof nodeSchema>;
export const planSchema = z.strictObject({
  schema: z.literal('operator-plan/v1'), name: z.string().min(1).max(100),
  entry: z.string(), maxSteps: z.number().int().min(1).max(1000),
  timeoutMs: z.number().int().min(1).max(120_000),
  nodes: z.array(nodeSchema).min(1).max(100),
}).superRefine((plan, ctx) => {
  const ids = new Set<string>();
  for (const node of plan.nodes) {
    if (ids.has(node.id)) ctx.addIssue({ code: 'custom', message: `ID duplicado: ${node.id}` });
    ids.add(node.id);
    if (node.kind === 'wait' && node.durationMs > node.deadlineMs)
      ctx.addIssue({ code: 'custom', message: `Espera excede deadline: ${node.id}` });
  }
  if (!ids.has(plan.entry)) ctx.addIssue({ code: 'custom', message: 'Entrada inexistente' });
  for (const node of plan.nodes) for (const next of Object.values(node.next)) {
    if (next && !ids.has(next)) ctx.addIssue({ code: 'custom', message: `Destino inexistente: ${next}` });
  }
});
export type Plan = z.infer<typeof planSchema>;
export function parsePlan(value: unknown): Plan { return planSchema.parse(value); }
