import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function parseHardwareIdentity(value:string):string {
 const id=value.trim();
 if(!/^[a-zA-Z0-9_-]{1,96}$/.test(id)||id.toLowerCase()==='unknown')throw new Error('Hardware identity unavailable; do not use transport address as lease identity');
 return id;
}
export async function hardwareIdentity(transport:string,signal?:AbortSignal):Promise<string>{
 if(!/^[a-zA-Z0-9_.:-]{1,128}$/.test(transport))throw new Error('Invalid ADB transport');
 const r=await exec('adb',['-s',transport,'shell','getprop','ro.serialno'],{timeout:5000,signal,maxBuffer:10000});
 return parseHardwareIdentity(r.stdout);
}
