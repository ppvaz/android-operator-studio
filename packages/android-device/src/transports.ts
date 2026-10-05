// Selected transport mechanisms from the FNaF research, with provenance in ORIGIN.json.
import {spawn,execFileSync} from 'node:child_process';
import {connect} from 'node:net';
import {writeFileSync} from 'node:fs';
import type {ChildProcessByStdio} from 'node:child_process';
import type {Readable,Writable} from 'node:stream';
import {parseSnapReply} from './snap-reply.js';
import {COMPANION_ENDPOINT_FILE,parseCompanionEndpoint} from './endpoint.js';
import {sleep,terminate} from './port-kit.js';
// Stable wire identity of the installed Companion; this is not a source checkout dependency.
const HELPER_PACKAGE='com.ppvaz.fnafcompanion';
const READY_DEVICE='FNAF Timed Touch';
function endpointError(message:string):never{throw new Error(`Companion endpoint: ${message}`);}
interface CompanionEndpoint {
  readonly port: number;
  readonly token: string;
  readonly socket?: string;
  readonly session?: number;
  readonly source?: 'endpoint-file';
}

export function parseCompanionLogEndpoint(text: unknown): CompanionEndpoint {
  if (typeof text !== 'string') endpointError('logcat output is not text');
  const lines = text.split(/\r?\n/).filter(line => /control=(?:READY|DEGRADED)/.test(line));
  const line = lines.at(-1);
  if (!line) endpointError('no READY or DEGRADED endpoint');
  const port = line.match(/\bport=(\d+)\b/)?.[1];
  const token = line.match(/\btoken=([0-9a-f]{32})\b/)?.[1];
  if (!port || !token) endpointError('endpoint has no bounded port/token');
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535)
    endpointError('endpoint port is outside 1..65535');
  return Object.freeze({ port: numericPort, token });
}

function runSync(adb: string, args: string[], { timeout = 5000, input, maxBuffer = 1024 * 1024 }: {timeout?: number, input?: string, maxBuffer?: number} = {}) {
  return execFileSync(adb, args, { encoding: 'utf8', input, timeout, maxBuffer }).replace(/\r/g, '');
}

/** The same bounded adb call, its output kept as bytes (a pulled frame). */
function runSyncBytes(adb: string, args: string[], { timeout = 5000, maxBuffer = 1024 * 1024 }: {timeout?: number, maxBuffer?: number} = {}) {
  return execFileSync(adb, args, { timeout, maxBuffer });
}


const HELPER_DISCOVERY_SCRIPT = `
logcat -d --pid="$1" -e 'control=(READY|DEGRADED)' -v brief -s FnafCueHelper:I '*:S' | tail -n 32
`;
function lineExchange(hostPort: number, line: string, timeoutMs: number, maxChars = 4096): Promise<string> {
  return new Promise<string>((resolvePromise, rejectPromise) => {
    const socket = connect({ host: '127.0.0.1', port: hostPort });
    let text = '';
    let settled = false;
    const settle = (error: unknown, value?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      // Every call without an error carries its reply line.
      if (error) rejectPromise(error); else if(value!==undefined) resolvePromise(value); else rejectPromise(new Error('Companion returned no reply'));
    };
    // Same deferral as timedExchange: bytes that arrived in time win over a
    // timer that expired while the event loop was blocked.
    const timer = setTimeout(() => setImmediate(() => settle(new Error('Companion exchange timed out'))), timeoutMs);
    socket.setNoDelay(true);
    socket.on('connect', () => socket.write(`${line}\n`));
    socket.on('data', chunk => {
      text += chunk.toString('utf8');
      const newline = text.indexOf('\n');
      if (newline >= 0) settle(null, text.slice(0, newline).trim());
      else if (text.length > maxChars) settle(new Error('Companion reply is oversized'));
    });
    socket.on('error', error => settle(error));
    socket.on('end', () => settle(text ? null : new Error('Companion closed the exchange without a reply'), text.trim()));
  });
}


export class AdbCompanionPort {
  declare serial: string;
  declare adb: string;
  declare endpoint: CompanionEndpoint | null;
  constructor(options: {serial: string, adb?: string}) {
    const { serial, adb = 'adb' } = options ?? {};
    if (typeof serial !== 'string' || serial.length === 0) throw new TypeError('Companion port requires an ADB serial');
    this.serial = serial; this.adb = adb; this.endpoint = null;
  }

  /**
   * Find the live session's endpoint: the Companion's handshake file first
   * (files/companion-endpoint.properties, read with run-as; it cannot rotate
   * out the way a logcat line does), and the logcat announcement only when
   * the file is absent -- a helper older than 0.2.0. The file must belong to
   * the running process.
   */
  discover() {
    const pid = runSync(this.adb, ['-s', this.serial, 'shell', 'pidof', HELPER_PACKAGE]).trim().split(/\s+/)[0] ?? '';
    if (!/^\d+$/.test(pid)) endpointError('helper process is not running');
    let text: string | null = null;
    try {
      text = runSync(this.adb, ['-s', this.serial, 'exec-out', 'run-as', HELPER_PACKAGE, 'cat', COMPANION_ENDPOINT_FILE]);
    } catch { /* no file: an older helper, or no session yet */ }
    if (text && text.includes('schema=')) {
      const file = parseCompanionEndpoint(text);
      if (String(file.pid) !== pid) endpointError(`endpoint file belongs to pid ${file.pid}, not the running helper ${pid}`);
      this.endpoint = Object.freeze({ port: file.port, token: file.token, socket: file.socket,
        session: file.session, source: 'endpoint-file' });
      return { ...this.endpoint };
    }
    // A night fills this tag with capture diagnostics. Filter on the phone so
    // discovery still fits its bounded buffer after a long-running capture,
    // while retaining the latest endpoint rather than the first announcement.
    const log = runSync(this.adb, ['-s', this.serial, 'shell', 'sh', '-s', '--', pid],
      { input: HELPER_DISCOVERY_SCRIPT });
    this.endpoint = parseCompanionLogEndpoint(log);
    return { ...this.endpoint };
  }

  /** An adb forward from a free host port to the helper's control port; the caller removes it. */
  #forward(endpoint: CompanionEndpoint, channel: string) {
    const forwarded = runSync(this.adb, ['-s', this.serial, 'forward', 'tcp:0', `tcp:${endpoint.port}`]).trim().split(/\s+/).at(-1);
    if (!forwarded || !/^\d+$/.test(forwarded)) throw new Error(`${channel}: adb forward returned no host port`);
    return Number(forwarded);
  }

  #unforward(port: number) {
    try { runSync(this.adb, ['-s', this.serial, 'forward', '--remove', `tcp:${port}`]); } catch { /* the forward dies with adb */ }
  }


  /**
   * One whole native frame from the helper's projection, as a PNG on the
   * host: SNAP writes it under the helper's files/frames, and it is pulled
   * with run-as and removed. For title, menu and calibration screens; a
   * night reads openRegions() instead.
   */
  async snap(label: string, target: string, { timeoutMs = 5000 }: {timeoutMs?: number} = {}) {
    if (!/^[A-Za-z0-9._-]{1,48}$/.test(label)) throw new TypeError('snap label must be 1..48 of [A-Za-z0-9._-]');
    const endpoint = this.endpoint ?? this.discover();
    const forwarded = this.#forward(endpoint, 'Companion snap');
    try {
      const reply = await lineExchange(forwarded, `SNAP ${endpoint.token} ${label}`, timeoutMs);
      const fields = parseSnapReply(reply, label);
      const bytes = runSyncBytes(this.adb, ['-s', this.serial, 'exec-out', 'run-as', HELPER_PACKAGE, 'cat', fields.path],
        { timeout: 10000, maxBuffer: 64 * 1024 * 1024 });
      if (!bytes || bytes.length < 1000) throw new Error('Companion snap pulled an empty frame');
      writeFileSync(target, bytes);
      try { runSync(this.adb, ['-s', this.serial, 'shell', 'run-as', HELPER_PACKAGE, 'rm', '-f', fields.path]); } catch { /* next snap overwrites */ }
      return { path: target, imageNs: fields.imageNs, snapshotNs: fields.snapshotNs, bytes: bytes.length };
    } finally {
      this.#unforward(forwarded);
    }
  }


}

export class AdbHidProcess {
  declare serial: string;
  declare adb: string;
  declare readyTimeoutMs: number;
  declare closeGraceMs: number;
  declare child: ChildProcessByStdio<Writable, null, Readable> | null;
  declare failed: Error | null;
  declare closed: boolean;
  /** @param options.closeGraceMs how long close() waits after SIGTERM, and again after SIGKILL */
  constructor(options: {serial: string, adb?: string, readyTimeoutMs?: number, closeGraceMs?: number}) {
    const { serial, adb = 'adb', readyTimeoutMs = 12000, closeGraceMs = 1000 } = options ?? {};
    if (typeof serial !== 'string' || serial.length === 0) throw new TypeError('HID port requires an ADB serial');
    this.serial = serial; this.adb = adb; this.readyTimeoutMs = readyTimeoutMs; this.closeGraceMs = closeGraceMs;
    this.child = null; this.failed = null; this.closed = false;
  }

  ensureStarted() {
    if (this.closed) throw new Error('ADB HID process is closed');
    if (this.failed) throw this.failed;
    if (this.child) return;
    const child = spawn(this.adb, ['-s', this.serial, 'shell', '/system/bin/hid', '-'], {
      stdio: ['pipe', 'ignore', 'pipe'], shell: false,
    });
    child.on('error', error => { this.failed = error; });
    child.on('close', code => {
      if (!this.closed && code !== 0) this.failed = new Error(`ADB HID process exited with ${code}`);
      this.child = null;
    });
    this.child = child;
  }

  async write(line: unknown) {
    if (typeof line !== 'string' || line.includes('\n') || line.includes('\r'))
      throw new TypeError('HID port accepts one JSONL line at a time');
    this.ensureStarted();
    if (this.failed || !this.child?.stdin) throw this.failed ?? new Error('ADB HID stdin is unavailable');
    const stdin = this.child.stdin;
    if (!stdin.write(`${line}\n`)) await new Promise<unknown>((resolve, reject) => {
      stdin.once('drain', resolve); stdin.once('error', reject);
    });
  }

  async ready(deviceName = READY_DEVICE) {
    this.ensureStarted();
    const deadline = Date.now() + this.readyTimeoutMs;
    while (Date.now() < deadline) {
      if (this.failed) throw this.failed;
      try {
        const output = runSync(this.adb, ['-s', this.serial, 'shell', 'dumpsys', 'input'], { timeout: 2000 });
        if (output.includes(deviceName)) return;
      } catch { /* a transient dumpsys failure stays inside the bounded wait */ }
      await sleep(100);
    }
    throw new Error('InputReader did not expose the registered HID device before the deadline');
  }

  /**
   * End the stream and the process that holds it. A process that outlives
   * SIGTERM is killed; close() resolves only once it has exited and throws if
   * it has not, so a halt never records a stream as closed while it still runs.
   */
  async close() {
    this.closed = true;
    const child = this.child;
    this.child = null;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.stdin?.end();
    await terminate(child, this.closeGraceMs);
  }
}
