const bounded = (value: unknown): value is string => typeof value === 'string' && value.length <= 4096;
export function parseCueResponse(line: unknown) {
  if (!bounded(line)) throw new TypeError('Companion response is missing or oversized');
  const text = line.trim();
  if (!text.startsWith('OK ')) throw new Error(text.startsWith('ERROR ') ? text : 'Companion response is not OK');
  const fields: Record<string, string> = {};
  for (const token of text.slice(3).split(/\s+/)) {
    const separator = token.indexOf('=');
    if (separator <= 0) continue;
    fields[token.slice(0, separator)] = token.slice(separator + 1);
  }
  return Object.freeze(fields);
}

/**
 * The OK reply to `SNAP <token> <label>` (SnapReply.java writes it): the frame's app-relative path, which must
 * be the label's own PNG under files/frames, and the two helper clocks that place it. Held from both sides by
 * testdata/companion-snap-v1.txt.
 */
export function parseSnapReply(line: unknown, label: string) {
  const fields = parseCueResponse(line);
  const path = `files/frames/${label}.png`;
  if (fields.path !== path) throw new Error(`Companion snap wrote ${fields.path ?? 'no path'}, not ${path}`);
  const clock = (name: 'imageNs' | 'snapshotNs') => {
    const value = fields[name];
    if (value === undefined || !/^\d{1,20}$/.test(value)) throw new Error(`Companion snap reply has no ${name}`);
    return BigInt(value);
  };
  return { path, imageNs: clock('imageNs'), snapshotNs: clock('snapshotNs') };
}
