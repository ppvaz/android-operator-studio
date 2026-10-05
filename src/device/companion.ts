import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import {hash} from '../core/identity.js';
import type {Observation,Target} from '../core/port.js';
import {leasedCommand} from './lease.js';
import {hardwareIdentity} from './identity.js';
const exec=promisify(execFile);
export class CompanionTarget implements Target {
 readonly name:string;readonly level='DEVICE_MEASURED';
 constructor(private readonly serial:string){
  if(!/^[a-zA-Z0-9_.:-]{1,96}$/.test(serial))throw new Error('Invalid serial');
  this.name=`companion:${hash(serial).slice(0,16)}`;
 }
 async observe(signal:AbortSignal):Promise<Observation>{
  const hardware=await hardwareIdentity(this.serial,signal);
  const directory=await mkdtemp(join(tmpdir(),'operator-native-'));
  try{
   const invocation=leasedCommand(hardware,[process.execPath,fileURLToPath(new URL('./native-frame-cli.js',import.meta.url)),this.serial,join(directory,'frame.png')]);
   const result=await exec(invocation.file,invocation.args,{env:invocation.env,signal,timeout:25000,maxBuffer:1024*1024});
   const snapshot=z.object({imageNs:z.string().regex(/^\d+$/),snapshotNs:z.string().regex(/^\d+$/),bytes:z.number()}).parse(JSON.parse(result.stdout));
   const image=await readFile(join(directory,'frame.png'));signal.throwIfAborted();
   if(image.length<24||!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid native PNG');
   return{id:hash(image),clock:'host-monotonic',receivedAtMs:performance.now(),image,
    facts:{width:image.readUInt32BE(16),height:image.readUInt32BE(20),frameSha256:hash(image),deviceId:hash(hardware).slice(0,16),transportId:hash(this.serial).slice(0,16),deviceImageNs:snapshot.imageNs,deviceSnapshotNs:snapshot.snapshotNs,deviceClock:'companion-System.nanoTime',backend:'companion-native-snap',clockMap:'UNKNOWN'}};
  }finally{await rm(directory,{recursive:true,force:true});}
 }
 async tap():Promise<never>{throw new Error('Android product backend remains read-only');}
}
