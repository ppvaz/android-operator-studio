import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {toRaw,report,parseSnapReply,leaseExecutable,HidWireTransport} from '@android-operator/device';
import {readConfig,leaseDirectory,fnafIntegrationCheckout} from '../config.js';
import {parseHardwareIdentity} from '../device/identity.js';
const exec=promisify(execFile);
test('wireless transport address is refused as hardware lease identity',()=>{
 assert.equal(parseHardwareIdentity('  DEVICE_123\n'),'DEVICE_123');
 for(const value of ['', 'unknown', '192.168.0.3:40483', 'device serial', '../device'])assert.throws(()=>parseHardwareIdentity(value));
});
test('device capture/input package is usable without configuring a game checkout',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'operator-config-'));
 try{
  assert.deepEqual(readConfig(dir),{schema:'operator-config/v1'});
  assert.throws(()=>fnafIntegrationCheckout(dir),/optional FNaF/);
  assert.equal(leaseDirectory(dir).endsWith('android-operator/locks'),true);
  assert.deepEqual(toRaw([0,1080]),[0,0]);assert.deepEqual(toRaw([2400,0]),[2400,1080]);
  assert.deepEqual(report([{flags:0,point:{x:1825,y:430}}]),[1,1,0,164,5,53,3,4,0,0,0,0]);
  assert.throws(()=>parseSnapReply('OK path=files/frames/other.png imageNs=1 snapshotNs=2','own'),/not files/);
  assert.deepEqual(parseSnapReply('OK path=files/frames/own.png imageNs=1 snapshotNs=2','own'),{path:'files/frames/own.png',imageNs:1n,snapshotNs:2n});
  await mkdir(join(dir,'.operator'));await writeFile(join(dir,'.operator/config.json'),JSON.stringify({schema:'operator-config/v1',device:{leaseDirectory:'shared-locks'}}));
  assert.equal(leaseDirectory(dir),join(dir,'shared-locks'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('extracted HID emits the original release filler and cleanup without a source checkout',async()=>{
 const lines:string[]=[];let ready=0;const wire=new HidWireTransport({write:line=>{lines.push(line);},ready:()=>{ready++;},sleep:async()=>{},contactMs:75});
 await wire.send({command:{action:{kind:'press',durationMs:75}},point:{x:1825,y:430}});await wire.releaseAll();
 assert.equal(ready,1);assert.equal(lines.length,4);
 const release:unknown=JSON.parse(lines[2]??'');assert.deepEqual(release,{id:92,command:'report',report:[1,1,0,164,5,53,3,4,0,0,0,0]});
 await wire.abort();await assert.rejects(wire.send({command:{action:{kind:'press',durationMs:75}},point:{x:1825,y:430}}),/aborted/);
});
test('packaged lease blocks unrelated processes, permits descendants and releases after termination',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'operator-lease-')),marker=join(dir,'ready');
 const env={...process.env,CUE_HELPER_LOCK_DIR:dir};
 const child=spawn('python3',[leaseExecutable,'fixture-phone','--',process.execPath,'--input-type=module','-e',`import {writeFileSync} from 'node:fs';writeFileSync(process.argv[1],'ready');setInterval(()=>{},1000);`,marker],{env,stdio:['ignore','pipe','pipe']});
 try{
  for(let n=0;n<100;n++){try{await readFile(marker);break;}catch{await new Promise(r=>setTimeout(r,20));}}
  assert.equal(await readFile(marker,'utf8'),'ready');
  await assert.rejects(exec('python3',[leaseExecutable,'fixture-phone','--',process.execPath,'-e','process.exit(0)'],{env,timeout:3000}),error=>error instanceof Error&&'code' in error&&error.code===75);
  child.kill('SIGTERM');await new Promise<void>(resolve=>child.once('exit',()=>resolve()));
  const result=await exec('python3',[leaseExecutable,'fixture-phone','--','python3',leaseExecutable,'fixture-phone','--',process.execPath,'-e',"console.log('borrowed')"],{env,timeout:5000});assert.equal(result.stdout.trim(),'borrowed');
 }finally{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await rm(dir,{recursive:true,force:true});}
});
