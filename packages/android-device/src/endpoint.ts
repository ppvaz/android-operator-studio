const COMPANION_ENDPOINT_SCHEMA = 'companion-endpoint-v1';
export const COMPANION_ENDPOINT_FILE = 'files/companion-endpoint.properties';
export function parseCompanionEndpoint(text: string) {
  if (typeof text !== 'string' || text.length > 4096) throw new Error('companion-endpoint-v1: text is missing or oversized');
  const source = text.includes('\n') ? text.split(/\r?\n/) : text.trim().replace(/^.*?\bCOMPANION\s+/, '').split(/\s+/);
  const fields: Record<string, string> = {};
  for (const token of source) {
    const value = token.trim();
    if (!value) continue;
    const at = value.indexOf('=');
    if (at <= 0) continue;
    fields[value.slice(0, at)] = value.slice(at + 1);
  }
  function bad(message: string): never { throw new Error(`companion-endpoint-v1: ${message}`); }
  if (fields.schema !== COMPANION_ENDPOINT_SCHEMA) bad(`schema is ${fields.schema ?? 'missing'}`);
  if (!fields.token || !/^[0-9a-f]{32}$/.test(fields.token)) bad('token is not 128-bit hex');
  const port = Number(fields.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) bad('port is outside 1..65535');
  if (!fields.socket || !/^com\.fnaf2\.cuehelper\.control\.[0-9a-z]+$/.test(fields.socket)) bad('socket is not the control socket name');
  for (const key of ['code', 'session', 'pid'])
    if (!/^\d+$/.test(fields[key] ?? '')) bad(`${key} is not an integer`);
  return Object.freeze({ schema: fields.schema, app: fields.app ?? null, code: Number(fields.code),
    session: Number(fields.session), pid: Number(fields.pid), port, socket: fields.socket, token: fields.token });
}
