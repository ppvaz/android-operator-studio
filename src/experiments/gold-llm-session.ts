import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import {devices,AdbReadOnlyTarget} from '../device/adb.js';
import {hardwareIdentity} from '../device/identity.js';
import {goldRequestSchema,plannedActions} from './llm-action-block.js';
import {leasedCommand} from '../device/lease.js';
import {hash} from '../core/identity.js';
import {openResearchPortraitHid} from './portrait-hid.js';
import {LlmReviewTarget,deferredObservation} from './llm-review-target.js';
import {parsePlan} from '../core/plan.js';
import {execute} from '../core/runtime.js';
import type {Observation} from '../core/port.js';
import {myOldBoyLayout,emulatorViewport,nativeCrop} from './myoldboy-layout.js';

const exec=promisify(execFile),root=resolve('.operator/experiments/pokemon-gold-training-20261005');
const [verb,label,requestFile,internal]=process.argv.slice(2);
if(!verb||!label||!/^[a-z0-9-]{1,64}$/.test(label))throw new Error('Unique label required');
const active=(await devices()).filter(d=>d.state==='device');
if(active.length!==1||!active[0])throw new Error('Exactly one authorized phone required');
const serial=active[0].serial;
const hardware=await hardwareIdentity(serial);
if(hash(hardware).slice(0,16)!=='f88a35e75d347b6b')throw new Error('Device identity drift');
if(internal!=='--lease-child'){
 const invocation=leasedCommand(hardware,[process.execPath,fileURLToPath(import.meta.url),verb,label,requestFile??'-','--lease-child']);
 const r=await exec(invocation.file,invocation.args,{env:invocation.env,timeout:55000,maxBuffer:1024*1024});console.log(r.stdout.trim());
}else{
 await mkdir(root,{recursive:true});await writeFile(join(root,`${label}.reserved`),new Date().toISOString(),{flag:'wx'});
 const controller=new AbortController();for(const s of ['SIGINT','SIGTERM'] as const)process.once(s,()=>controller.abort(new Error(s)));
 const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(50000)]);
 const adb=(...args:string[])=>exec('adb',['-s',serial,...args],{signal,timeout:5000,maxBuffer:4*1024*1024});
 const provenance:unknown=JSON.parse(await readFile('packages/android-device/ORIGIN.json','utf8')),instrument:Record<string,string>={};
 const packageFiles=async(directory:string):Promise<string[]>=>{
  const paths:string[]=[];for(const entry of await readdir(directory,{withFileTypes:true})){
   if(entry.name==='__pycache__')continue;
   const path=join(directory,entry.name);if(entry.isDirectory())paths.push(...await packageFiles(path));else paths.push(path);
  }return paths;
 };
 for(const path of ['src/experiments/llm-action-block.ts','dist/experiments/llm-action-block.js','src/device/adb.ts','dist/device/adb.js','src/config.ts','src/device/identity.ts','src/device/lease.ts','src/device/companion.ts','dist/config.js','dist/device/identity.js','dist/device/lease.js','dist/device/companion.js','src/experiments/llm-review-target.ts','src/experiments/gold-llm-session.ts','src/experiments/myoldboy-layout.ts','src/experiments/portrait-hid.ts','dist/experiments/gold-llm-session.js','dist/experiments/llm-review-target.js','dist/experiments/myoldboy-layout.js','dist/experiments/portrait-hid.js','docs/experiments/POKEMON-GOLD-LLM-20261005.protocol.json','package-lock.json',...await packageFiles('packages/android-device')]){
  const bytes=await readFile(path),digest=hash(bytes);instrument[path]=digest;await mkdir(join(root,'instrument'),{recursive:true});await writeFile(join(root,'instrument',digest),bytes);
 }
 const sensor=new AdbReadOnlyTarget(serial);
 let layout:ReturnType<typeof myOldBoyLayout>|undefined,layoutHash:string|undefined;
 let n=0,lastCaptured:Observation|undefined;
 const capture=async(captureSignal:AbortSignal)=>{
  const o=await sensor.observe(captureSignal);if(!o.image||o.facts['width']!==1080||o.facts['height']!==2400||!layout||!layoutHash)throw new Error('Physical/layout geometry unavailable');
  o.facts['captureBackend']='adb-diagnostic';o.facts['deviceClock']='UNKNOWN';
  o.facts['layoutSha256']=layoutHash;
  const file=`${label}-${++n}.png`;await writeFile(join(root,file),o.image,{flag:'wx'});
  const {image,...metadata}=o;await writeFile(join(root,`${file}.json`),JSON.stringify({...metadata,capturedAt:new Date().toISOString(),file},null,2),{flag:'wx'});
  const crop=nativeCrop(layout.video,[1080,2400],[1080,2400]);
  await exec('sips',['-c',String(crop[3]-crop[1]),String(crop[2]-crop[0]),'--cropOffset',String(crop[1]),String(crop[0]),join(root,file),'--out',join(root,`${label}-${n}-game.png`)],{signal,timeout:3000,maxBuffer:100000});
  lastCaptured=o;return o;
 };
 const guard=async()=>{
  const a=await adb('shell','dumpsys','activity','activities');
  const foreground=/(?:topResumedActivity|mResumedActivity)[^\n]*?\s([a-zA-Z0-9_.]+)\//.exec(a.stdout)?.[1];
  const size=await adb('shell','wm','size');
  if(foreground!=='com.fastemulator.gbc'||!size.stdout.includes('1080x2400'))throw new Error('Foreground/display drift');
  if(verb==='act'&&!/com\.fastemulator\.gbc\/(?:[\w.]*\.)?EmulatorActivity\b/.test(a.stdout))throw new Error('Gameplay activity required');
 };
 const pauseMarker=join(root,'game-paused.json');
 const menuWitness=async()=>{
  const remote='/sdcard/operator-gold-pause.xml';
  try{await adb('shell','uiautomator','dump',remote);return(await adb('exec-out','cat',remote)).stdout;}
  finally{await adb('shell','rm','-f',remote);}
 };
 const isEmulatorMenu=(xml:string)=>['Load','Save','Settings','Close'].every(text=>xml.includes(`text="${text}"`));
 const resume=async()=>{
  let marker:string;try{marker=await readFile(pauseMarker,'utf8');}catch(e:unknown){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
  await guard();const xml=await menuWitness();if(!isEmulatorMenu(xml))throw new Error('Recorded pause no longer matches foreground menu');
  await writeFile(join(root,`${label}-resume.xml`),xml,{flag:'wx'});
  await adb('shell','input','keyevent','4');await rm(pauseMarker);
  await writeFile(join(root,`${label}-resume.json`),JSON.stringify({previousPause:JSON.parse(marker),at:new Date().toISOString()}),{flag:'wx'});
 };
 const pause=async()=>{
  await guard();const activity=await adb('shell','dumpsys','activity','activities');
  if(!/com\.fastemulator\.gbc\/(?:[\w.]*\.)?EmulatorActivity\b/.test(activity.stdout))return;
  if(!layout)throw new Error('Cannot pause without current menu geometry');
  await adb('shell','input','tap',String(layout.menu[0]),String(layout.menu[1]));const xml=await menuWitness();
  await writeFile(join(root,`${label}-pause.xml`),xml,{flag:'wx'});
  if(!isEmulatorMenu(xml))throw new Error('Pause menu not confirmed');
  const proof={label,at:new Date().toISOString(),kind:'normal-emulator-menu',clockStopped:'not yet independently measured'};
  await writeFile(pauseMarker,JSON.stringify(proof));await writeFile(join(root,`${label}-pause.json`),JSON.stringify(proof),{flag:'wx'});
 };
 const loadLayout=async()=>{
  const binding=z.object({profile:z.string().regex(/^[a-zA-Z0-9_-]+$/),file:z.string().regex(/^[a-zA-Z0-9_-]+-\d+x\d+\.xml$/)}).parse(JSON.parse(await readFile(join(root,'layout-binding.json'),'utf8')));
  const dir='/sdcard/Android/data/com.fastemulator.gbc/files/config/layout';
  const names=(await adb('shell','ls',dir)).stdout.trim().split(/\r?\n/);
  if(names.length!==1||names[0]!==binding.file)throw new Error('Layout profile set changed; rebind selected profile from UI');
  const xml=(await adb('exec-out','cat',`${dir}/${binding.file}`)).stdout,surface=await menuWitness(),viewport=emulatorViewport(surface);
  if(viewport[0]<0||viewport[1]<0||viewport[2]>1080||viewport[3]>2400||binding.file!==`${binding.profile}-${viewport[2]-viewport[0]}x${viewport[3]-viewport[1]}.xml`)throw new Error('Layout/viewport mismatch');
  layout=myOldBoyLayout(xml,viewport);layoutHash=hash(Buffer.from(xml+JSON.stringify(viewport)));
  await writeFile(join(root,`${label}-layout.xml`),xml,{flag:'wx'});await writeFile(join(root,`${label}-surface.xml`),surface,{flag:'wx'});
  await writeFile(join(root,`${label}-layout.json`),JSON.stringify({binding,layoutHash,...layout,source:'current on-device XML + fresh Android SurfaceView bounds',subregionBasis:'combined Start/Select halves and D-pad cardinal interiors visually qualified; XML supplies parent bounds'},null,2),{flag:'wx'});
 };
 let outcome:unknown,error:string|undefined,pauseAfter=true;
 try{
  await guard();
  await resume();
  await loadLayout();
  if(verb==='see')outcome=await capture(signal);
  else if(verb==='act'){
   if(!requestFile)throw new Error('Review file required');
   const request=goldRequestSchema.parse(JSON.parse(await readFile(requestFile,'utf8'))),actions=plannedActions(request);
   pauseAfter=request.pauseAfter;
   const metadata=z.object({id:z.string(),capturedAt:z.string(),facts:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()]))}).parse(JSON.parse(await readFile(join(root,`${request.frame}.json`),'utf8')));
   const age=Date.now()-Date.parse(metadata.capturedAt);if(age<0||age>90000)throw new Error('Frame expired; acquire and review again');
   const image=await readFile(join(root,request.frame));if(hash(image)!==metadata.id)throw new Error('Frame hash mismatch');
   if(metadata.facts['layoutSha256']!==layoutHash)throw new Error('Review/layout mismatch; capture and review current layout first');
   if((await readdir(root)).includes(`${request.frame}.consumed`))throw new Error('Frame already consumed; review a new observation');
   const contacts=(await readdir(root)).filter(f=>f.endsWith('.contact'));
   if(contacts.length+actions.length>2000)throw new Error('Session contact budget exhausted');
   await writeFile(join(root,`${request.frame}.consumed`),JSON.stringify(request),{flag:'wx'});
   const initialHoldMs=actions[0]?.holdMs;if(initialHoldMs===undefined)throw new Error('Empty action block');
   if(!layout)throw new Error('Layout required');
   const hid=await openResearchPortraitHid(serial,Object.values(layout.controls),initialHoldMs,actions.map(s=>s.holdMs));
   try{
    let current:Observation={id:metadata.id,receivedAtMs:performance.now()-age,clock:'host-monotonic',facts:metadata.facts,image};
    const results=[];
    for(let i=0;i<actions.length;i++){
    const step=actions[i];if(!step)throw new Error('Missing planned action');const point=layout.controls[step.action],holdMs=step.holdMs;
    const basis=step.basis,contactLabel=actions.length===1?label:`${label}-${i+1}`;
    if(i>0&&request.capture==='each')await writeFile(join(root,`${label}-${i}.png.consumed`),JSON.stringify({request,index:i,basis}),{flag:'wx'});
    const captureThisStep=request.capture==='each'||i===actions.length-1;
    const observationAfter= captureThisStep?capture:async(captureSignal:AbortSignal)=>{
     captureSignal.throwIfAborted();
     return deferredObservation(current);
    };
    const target=new LlmReviewTarget(current,
     {observationId:current.id,scene:step.scene,reasoning:request.reasoning,action:step.action,basis},observationAfter,
     async(x,y,ms,s)=>{await writeFile(join(root,`${contactLabel}.contact`),JSON.stringify({request,step,index:i,basis,point,nominalHoldMs:ms,at:new Date().toISOString()}),{flag:'wx'});await hid.contact(x,y,ms,s);await new Promise(r=>setTimeout(r,step.settleMs));},guard);
    const plan=parsePlan({schema:'operator-plan/v1',name:'One reviewed situational action',entry:'action',maxSteps:1,timeoutMs:15000,nodes:[{id:'action',kind:'tap',label:step.action,deadlineMs:14000,x:point[0],y:point[1],holdMs,before:{fact:'sceneReviewed',equals:true},after:{fact:'resultReviewed',equals:true},next:{}}]});
    const result=await execute(plan,target,signal);
    results.push(result);outcome=actions.length===1?{request,plan,result}:{request,plan,results};
    if(!result.steps[0]?.dispatched)throw new Error('Block stopped: dispatch missing');
    if(captureThisStep){
     if(n!==(request.capture==='each'?i+1:1)||!lastCaptured)throw new Error('Block stopped: fresh capture missing');
     current=lastCaptured;
    }
    }
   }finally{await hid.close();}
  }else throw new Error('Unknown verb');
 }catch(e:unknown){error=e instanceof Error?e.message:String(e);}
 if(pauseAfter||error)try{await pause();}catch(e:unknown){error=[error,e instanceof Error?e.message:String(e)].filter(Boolean).join('; ');}
 const clean=JSON.parse(JSON.stringify(outcome??null,(key,value:unknown)=>key==='image'?undefined:value));
 await writeFile(join(root,`${label}-operation.json`),JSON.stringify({label,verb,deviceId:hash(hardware).slice(0,16),transportId:hash(serial).slice(0,16),provenance,instrument,outcome:clean,error,completedAt:new Date().toISOString()},null,2),{flag:'wx'});
 console.log(JSON.stringify({label,error,frames:n,operationFile:`${label}-operation.json`},null,2));if(error)process.exitCode=1;
}
