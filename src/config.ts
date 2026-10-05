import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {z} from 'zod';
export const configSchema=z.strictObject({
 schema:z.literal('operator-config/v1'),
 device:z.strictObject({leaseDirectory:z.string().min(1)}).optional(),
 integrations:z.strictObject({fnaf:z.strictObject({checkout:z.string().min(1)}).optional()}).optional(),
});
export function readConfig(directory=process.cwd()) {
 const file=join(directory,'.operator','config.json');
 return existsSync(file)?configSchema.parse(JSON.parse(readFileSync(file,'utf8'))):configSchema.parse({schema:'operator-config/v1'});
}
export function leaseDirectory(directory=process.cwd()):string {
 const path=readConfig(directory).device?.leaseDirectory;
 return path?resolve(directory,path):join(homedir(),'.local','state','android-operator','locks');
}
export function fnafIntegrationCheckout(directory=process.cwd()):string {
 const path=readConfig(directory).integrations?.fnaf?.checkout;
 if(!path)throw new Error('Configure the optional FNaF integration in .operator/config.json (integrations.fnaf.checkout)');
 return resolve(directory,path);
}
