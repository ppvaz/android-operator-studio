import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { z } from 'zod';

export const FNAF_PNG_READER = 'packages/play/games/fnaf3/fnaf3-detectors.ts';
const decodedSchema = z.object({ width: z.number().int().positive(), height: z.number().int().positive(), gray: z.instanceof(Uint8Array) });
export type GrayFrame = z.infer<typeof decodedSchema>;
// Consume the existing reader, without importing FNaF 3's game detectors.
export async function decodeFnafPng(root: string, image: Buffer): Promise<GrayFrame> {
  const module: unknown = await import(pathToFileURL(join(root, FNAF_PNG_READER)).href);
  const reader = z.object({ decodePng: z.custom<(image: Buffer) => unknown>(value => typeof value === 'function') }).parse(module);
  const frame = decodedSchema.parse(reader.decodePng(image));
  if (frame.gray.length !== frame.width * frame.height) throw new Error('Invalid decoded pixel count');
  return frame;
}
export function difference(a: GrayFrame, b: GrayFrame, box: readonly [number, number, number, number], mapB = (x: number, y: number): readonly [number, number] => [x, y]): number {
  let sum = 0, count = 0;
  for (let y = box[1]; y < box[3]; y += 3) for (let x = box[0]; x < box[2]; x += 3) {
    const [bx, by] = mapB(x, y);
    const av = a.gray[y * a.width + x], bv = b.gray[Math.round(by) * b.width + Math.round(bx)];
    if (av === undefined || bv === undefined || x < 0 || y < 0 || x >= a.width || y >= a.height || bx < 0 || by < 0 || bx >= b.width || by >= b.height) throw new Error('Pixel mapping outside frame');
    sum += Math.abs(av - bv); count++;
  }
  if (!count) throw new Error('Empty comparison');
  return sum / count;
}
