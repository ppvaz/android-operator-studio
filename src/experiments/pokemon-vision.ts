import { z } from 'zod';
import type { GrayFrame } from '../device/fnaf-png.js';

export const stateSchema = z.enum(['overworld', 'menu-pokemon', 'party']);
export type PokemonState = z.infer<typeof stateSchema>;
const vector = z.array(z.number().int().min(0).max(255));
export const visionSchema = z.strictObject({
  schema: z.literal('operator-pokemon-vision/v1'),
  sourceFrames: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  controls: vector, pokemonCursor: vector.optional(), states: z.array(z.strictObject({ state: stateSchema, pixels: vector })),
  limits: z.strictObject({ controlsMeanAbs: z.number().positive(), stateMeanAbs: z.number().positive(), margin: z.number().positive() }),
});
export type Vision = z.infer<typeof visionSchema>;
const boxes = { controls:[965,675,1430,1030], game:[957,192,1443,630],cursor:[1224,288,1247,317] } as const;
export function samples(frame: GrayFrame, region: keyof typeof boxes): number[] {
  if (frame.width !== 2400 || frame.height !== 1080) throw new Error('Vision requires measured native geometry');
  const box = boxes[region], out: number[] = [];
  const step=region==='cursor'?1:6;
  for (let y = box[1]; y < box[3]; y += step) for (let x = box[0]; x < box[2]; x += step) {
    const value = frame.gray[y*frame.width+x]; if (value === undefined) throw new Error('Missing pixel'); out.push(value);
  }
  return out;
}
function meanAbs(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return Infinity;
  let sum = 0; for (let i=0;i<a.length;i++) sum+=Math.abs((a[i] ?? 0)-(b[i] ?? 0)); return sum/a.length;
}
export function recognize(frame: GrayFrame, vision: Vision) {
  if (frame.width !== 2400 || frame.height !== 1080) return { state:'UNKNOWN' as const, reason:'geometry', controlsMeanAbs:Infinity, scores:[] };
  const controlsMeanAbs = meanAbs(samples(frame,'controls'), vision.controls);
  const game = samples(frame,'game');
  const best=new Map<PokemonState,number>();
  for (const reference of vision.states) best.set(reference.state,Math.min(best.get(reference.state)??Infinity,meanAbs(game,reference.pixels)));
  const scores = [...best].map(([state,meanAbs])=>({state,meanAbs})).sort((a,b)=>a.meanAbs-b.meanAbs);
  const first=scores[0], second=scores[1];
  if (!first || controlsMeanAbs>vision.limits.controlsMeanAbs) return { state:'UNKNOWN' as const,reason:'controls',controlsMeanAbs,scores };
  if (first.meanAbs>vision.limits.stateMeanAbs || (second && second.meanAbs-first.meanAbs<vision.limits.margin)) return { state:'UNKNOWN' as const,reason:'ambiguous-or-new-state',controlsMeanAbs,scores };
  if(first.state==='menu-pokemon'&&vision.pokemonCursor&&meanAbs(samples(frame,'cursor'),vision.pokemonCursor)>2)
    return{state:'UNKNOWN' as const,reason:'pokemon-cursor-not-confirmed',controlsMeanAbs,scores};
  return { state:first.state,reason:'scoped-reference-match',controlsMeanAbs,scores };
}
