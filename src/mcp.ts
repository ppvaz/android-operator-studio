import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { Operator, targetSchema } from './operator.js';
import { parsePlan } from './core/plan.js';
import { identity } from './core/identity.js';
import { devices, AdbReadOnlyTarget } from './device/adb.js';
import { FnafCompanionTarget, configuredFnafRoot, inspectFnaf } from './device/fnaf.js';

const operator = new Operator();
const server = new McpServer({ name: 'android-operator-studio', version: '0.1.0' });
function content(value: unknown) { return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] }; }
server.registerTool('devices_list', {
  description: 'Listar aparelhos ADB e seus estados, sem alterar o aparelho.', inputSchema: z.strictObject({}),
}, async () => content(await devices()));
server.registerTool('device_observe', {
  description: 'Snapshot diagnóstico independente via ADB; não é captura temporal qualificada.',
  inputSchema: z.strictObject({ serial: z.string(), backend: z.enum(['fnaf-companion', 'adb-readonly']).default('fnaf-companion') }),
}, async ({ serial, backend }) => {
  const target = backend === 'fnaf-companion' ? new FnafCompanionTarget(configuredFnafRoot(), serial) : new AdbReadOnlyTarget(serial);
  const observation = await target.observe(AbortSignal.timeout(30_000));
  const { image, ...record } = observation;
  return { content: [
    { type: 'text' as const, text: JSON.stringify(record) },
    ...(image ? [{ type: 'image' as const, data: image.toString('base64'), mimeType: 'image/png' }] : []),
  ] };
});
server.registerTool('fnaf_inspect', {
  description: 'Inspecionar a integração local e os hashes das interfaces existentes de captura, lease e campanha FNaF.',
  inputSchema: z.strictObject({}),
}, async () => content(await inspectFnaf(configuredFnafRoot())));
server.registerTool('plan_validate', {
  description: 'Validar o mesmo artefato usado pelo editor. Não executa ações.',
  inputSchema: z.strictObject({ plan: z.unknown() }),
}, async ({ plan }) => { const parsed = parsePlan(plan); return content({ plan: parsed, planHash: identity(parsed) }); });
server.registerTool('plan_save', {
  description: 'Reter um plano versionado por hash para reuso por pessoa e agente.',
  inputSchema: z.strictObject({ plan: z.unknown() }),
}, async ({ plan }) => content({ planHash: await operator.store.savePlan(parsePlan(plan)) }));
server.registerTool('plan_load', {
  description: 'Ler um plano pelo seu hash SHA-256.', inputSchema: z.strictObject({ planHash: z.string() }),
}, async ({ planHash }) => content(await operator.store.loadPlan(planHash)));
server.registerTool('run_start', {
  description: 'Executar um plano limitado na fixture ou em Android somente leitura. Contatos Android são recusados.',
  inputSchema: z.strictObject({ plan: z.unknown(), target: targetSchema }),
}, async ({ plan, target }) => content({ id: await operator.start(plan, target) }));
server.registerTool('run_status', {
  description: 'Ler resultado, observações e rastros da execução nesta sessão.',
  inputSchema: z.strictObject({ id: z.string() }),
}, async ({ id }) => content(operator.status(id)));
server.registerTool('run_cancel', {
  description: 'Cancelar uma execução ativa.', inputSchema: z.strictObject({ id: z.string() }),
}, async ({ id }) => { operator.cancel(id); return content({ cancelled: true }); });
await server.connect(new StdioServerTransport());
