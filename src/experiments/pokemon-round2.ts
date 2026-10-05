// Closed research harness. Android product backends remain read-only.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { devices, AdbReadOnlyTarget } from '../device/adb.js';
import { configuredFnafRoot, FnafCompanionTarget, FNAF_FILES, inspectFnaf } from '../device/fnaf.js';
import { decodeFnafPng, difference, FNAF_PNG_READER } from '../device/fnaf-png.js';
import { hash } from '../core/identity.js';
import type { Observation } from '../core/port.js';
import { recognize, visionSchema } from './pokemon-vision.js';
import { z } from 'zod';
import { openPortraitHid, HID_SOURCES } from './fnaf-portrait-hid.js';
import { PokemonResearchTarget } from './pokemon-research-target.js';
import { execute } from '../core/runtime.js';
import { parsePlan } from '../core/plan.js';
import { Store } from '../core/store.js';

const exec = promisify(execFile);
const root = resolve('.operator/experiments/pokemon-round2-20261005');
const fnaf = configuredFnafRoot();
const [verb, label, internal] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]{1,64}$/.test(label)) throw new Error('Unique lowercase label required');
const phase3=label.startsWith('p3-');
const active = (await devices()).filter(device => device.state === 'device');
if (active.length !== 1 || !active[0]) throw new Error('Requires one authorized device');
const serial = active[0].serial;
// Hold the original lease across the complete bracket, not just SNAP.
if (internal !== '--lease-child') {
  const result = await exec('python3', [join(fnaf, FNAF_FILES.lease), serial, '--', 'env', 'FNAF_LEASE_HELD=1', `ANDROID_SERIAL=${serial}`,
    process.execPath, fileURLToPath(import.meta.url), verb ?? '', label, '--lease-child'], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  console.log(result.stdout.trim());
} else {
  await mkdir(root, { recursive: true });
  // Reserve the label before any action; retries cannot overwrite evidence.
  await writeFile(join(root, `${label}.reserved`), new Date().toISOString(), { flag: 'wx' });
  const instrument: Record<string, string> = {};
  async function archive(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await archive(path);
      else { const bytes = await readFile(path); const digest = hash(bytes); instrument[path] = digest;
        await mkdir(join(root, 'instrument'), { recursive: true });
        await copyFile(path, join(root, 'instrument', digest)); }
    }
  }
  await archive('src'); await archive('dist');
  for (const path of ['package-lock.json', 'docs/experiments/POKEMON-ROUND2-20261005.protocol.json','docs/experiments/POKEMON-ROUND2-20261005.phase2.json',
    'docs/experiments/POKEMON-ROUND2-20261005.phase3.json',
    'examples/pokemon-menu-party-research.json',...(await readdir(root)).filter(file=>/^vision-v[1234]\.json$/.test(file)).map(file=>join(root,file))]) {
    const bytes = await readFile(path); instrument[path] = hash(bytes); await writeFile(join(root, 'instrument', hash(bytes)), bytes);
  }
  const source = await inspectFnaf(fnaf);
  for (const path of [FNAF_PNG_READER, 'packages/play/bin/companion/companion-setup.py',...HID_SOURCES]) source.sources[path] = hash(await readFile(join(fnaf, path)));
  const signal = AbortSignal.timeout(28000);
  const adb = (...args: string[]) => exec('adb', ['-s', serial, ...args], { signal, timeout: 6000, maxBuffer: 4 * 1024 * 1024 });
  const physical = new AdbReadOnlyTarget(serial), native = new FnafCompanionTarget(fnaf, serial);
  async function capture(target: AdbReadOnlyTarget | FnafCompanionTarget, suffix: string, captureSignal:AbortSignal=signal) {
    const requestAtMs = performance.now(); const observation = await target.observe(captureSignal);
    const { image, ...record } = observation;
    if (!image) throw new Error('No image');
    await writeFile(join(root, `${label}-${suffix}.png`), image, { flag: 'wx' });
    const timed = { ...record, requestAtMs, completedAtMs: performance.now(), file: `${label}-${suffix}.png` };
    await writeFile(join(root, `${label}-${suffix}.json`), JSON.stringify(timed, null, 2), { flag: 'wx' });
    return { observation, timed };
  }
  const startedAt = new Date().toISOString(), startedAtMs = performance.now();
  async function reserveContact(){
    // Persist intent before input; ambiguous/failed dispatch still spends budget.
    const allContacts=(await readdir(root)).filter(file=>file.endsWith('.contact'));
    const contacts=allContacts.filter(file=>phase3?file.startsWith('p3-'):!file.startsWith('p3-'));
    // The first two contacts preceded the persistent-intent counter. Count
    // their retained successful operation records as well.
    const legacy=(await readdir(root)).filter(file=>['013-holdout-menu-operation.json','016-party-calibration-operation.json'].includes(file)).length;
    if(phase3?contacts.length>=6:contacts.length+legacy>=12) throw new Error('Research contact budget exhausted');
    await writeFile(join(root,`${label}-${contacts.length+1}.contact`),JSON.stringify({label,at:new Date().toISOString()}),{flag:'wx'});
  }
  let outcome: unknown, error: string | undefined,build:unknown;
  try {
    const baseline=z.object({deviceId:z.string()}).parse(JSON.parse(await readFile(join(root,'001-prepare-operation.json'),'utf8')));
    if(hash(serial).slice(0,16)!==baseline.deviceId)throw new Error('Device identity drift');
    const installed=await adb('shell','dumpsys','package','com.fastemulator.gbc');
    const emulator={versionCode:/\bversionCode=(\d+)/.exec(installed.stdout)?.[1],versionName:/\bversionName=(\S+)/.exec(installed.stdout)?.[1]};
    build={emulator,model:active[0].model};
    if(emulator.versionCode!=='90025'||emulator.versionName!=='2.0.3')throw new Error('Emulator build identity drift');
    if (verb === 'bracket') {
      const prior=(await readdir(root)).filter(file=>file.endsWith('-operation.json'));
      let count=0;for(const file of prior){const row=z.object({verb:z.string()}).parse(JSON.parse(await readFile(join(root,file),'utf8')));if(row.verb==='bracket')count++;}
      if(count>=8) throw new Error('Bracket budget exhausted');
      const before = await capture(physical, 'before');
      const middle = await capture(native, 'native');
      const after = await capture(physical, 'after');
      const pixels = async (o: Observation) => { if (!o.image) throw new Error('Missing frame'); return decodeFnafPng(fnaf, o.image); };
      const a = await pixels(before.observation), b = await pixels(middle.observation), c = await pixels(after.observation);
      if (a.width !== 1080 || a.height !== 2400 || c.width !== 1080 || c.height !== 2400 || b.width !== 2400 || b.height !== 1080) throw new Error('Unqualified geometry');
      const controls: readonly [number, number, number, number] = [20,1460,1020,2020];
      const top: readonly [number, number, number, number] = [80,130,1000,360];
      const map = (x: number, y: number): readonly [number, number] => [957 + x * 0.45, y * 0.45];
      // Fit sensitivity: report a grid of offsets, not just the expected offset.
      const fits = [-2,-1,0,1,2].map(dx => ({ dx, meanAbs: difference(a,b,controls,(x,y) => [957+x*0.45+dx,y*0.45]) }));
      const metrics = { adbControlsMeanAbs: difference(a,c,controls), adbTopMeanAbs: difference(a,c,top),
        nativeControlsMeanAbs: difference(a,b,controls,map), nativeTopMeanAbs: difference(a,b,top,map), fits };
      outcome = { before: before.timed, native: middle.timed, after: after.timed, metrics,
        clockMap: 'UNKNOWN', sequentialWitnesses: true, candidateMapping: { xScale:0.45,yScale:0.45,xOffset:957,yOffset:0 } };
    } else if (verb === 'physical') outcome = (await capture(physical, 'frame')).timed;
    else if(verb==='select-rom'){
      if(!phase3)throw new Error('Cold recovery is scoped to phase 3');
      const before=await capture(physical,'before');
      if(before.observation.facts['foregroundPackage']!=='com.fastemulator.gbc')throw new Error('ROM selection requires emulator foreground');
      const remote=`/sdcard/operator-${label}.xml`;let xml:string;
      try{
        await adb('shell','uiautomator','dump',remote);xml=(await adb('exec-out','cat',remote)).stdout;
        await writeFile(join(root,`${label}.xml`),xml,{flag:'wx'});
      }finally{await adb('shell','rm','-f',remote);}
      if(!xml.includes('resource-id="com.fastemulator.gbc:id/rom_list"'))throw new Error('Semantic ROM list not observed');
      const row=[...xml.matchAll(/<node\b[^>]*>/g)].map(match=>match[0]).find(node=>node.includes('text="Pokemon Red"')&&node.includes('package="com.fastemulator.gbc"')&&node.includes('enabled="true"'));
      const bounds=row&&/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(row);
      if(!bounds)throw new Error('Pokemon Red row not observed');
      if((await readdir(root)).some(file=>file.endsWith('.rom-contact')))throw new Error('ROM selection budget exhausted');
      const point={x:Math.floor((Number(bounds[1])+Number(bounds[3]))/2),y:Math.floor((Number(bounds[2])+Number(bounds[4]))/2)};
      await writeFile(join(root,`${label}.rom-contact`),hash(xml),{flag:'wx'});
      await adb('shell','input','tap',String(point.x),String(point.y));
      outcome={namedControl:'Pokemon Red',point,uiSha256:hash(xml),before:before.timed,after:(await capture(physical,'after')).timed};
    }
    else if(verb==='collapse-shade'){
      await adb('shell','cmd','statusbar','collapse');outcome=(await capture(physical,'after')).timed;
    }
    else if(verb==='inspect'){
      const [projection,input]=await Promise.all([adb('shell','dumpsys','media_projection'),adb('shell','dumpsys','input')]);
      outcome={projectionActive:projection.stdout.includes('com.ppvaz.fnafcompanion')&&projection.stdout.includes('TYPE_SCREEN_CAPTURE'),
        researchHidPresent:input.stdout.includes('FNAF Timed Touch'),frame:(await capture(physical,'frame')).timed};
    }
    else if (verb === 'runtime' || verb === 'cleanup' || verb==='cursor-refusal') {
      const visionBytes=await readFile(join(root,'vision-v4.json'));
      const vision=visionSchema.parse(JSON.parse(visionBytes.toString()));
      const reference=await decodeFnafPng(fnaf,await readFile(join(root,'003-baseline-before.png')));
      let sequence=0;
      const hid=await openPortraitHid(fnaf,serial);
      try{
        const target=new PokemonResearchTarget(vision,reference,async signal=>{
          signal.throwIfAborted(); const n=++sequence;
          const physicalShot=await capture(physical,`runtime-${n}-physical`,signal);
          const nativeShot=await capture(native,`runtime-${n}-native`,signal);
          if(!physicalShot.observation.image||!nativeShot.observation.image) throw new Error('Missing pixels');
          return {physical:physicalShot.observation,native:nativeShot.observation,
            physicalPixels:await decodeFnafPng(fnaf,physicalShot.observation.image),nativePixels:await decodeFnafPng(fnaf,nativeShot.observation.image)};
        },hid,reserveContact);
        const cleanup={schema:'operator-plan/v1',name:'Voltar da equipe ao mapa',entry:'back',maxSteps:2,timeoutMs:20000,nodes:[
          {id:'back',kind:'tap',label:'Voltar ao menu',deadlineMs:8000,x:650,y:1825,holdMs:150,before:{fact:'pokemonState',equals:'party'},after:{fact:'pokemonState',equals:'menu-pokemon'},next:{PASS:'close'}},
          {id:'close',kind:'tap',label:'Fechar menu',deadlineMs:8000,x:650,y:1825,holdMs:150,before:{fact:'pokemonState',equals:'menu-pokemon'},after:{fact:'pokemonState',equals:'overworld'},next:{}}
        ]};
        const refusal={schema:'operator-plan/v1',name:'Refuse A when Pokemon cursor is not confirmed',entry:'party',maxSteps:1,timeoutMs:7000,nodes:[
          {id:'party',kind:'tap',label:'A requires Pokemon selection',deadlineMs:6000,x:883,y:1940,holdMs:150,before:{fact:'pokemonState',equals:'menu-pokemon'},after:{fact:'pokemonState',equals:'party'},next:{}}
        ]};
        const plan=parsePlan(verb==='cleanup'?cleanup:verb==='cursor-refusal'?refusal:JSON.parse(await readFile('examples/pokemon-menu-party-research.json','utf8')));
        const result=await execute(plan,target,signal);
        const store=new Store(); await store.savePlan(plan);await store.saveRun(result);
        const persisted:unknown=JSON.parse(await readFile(join(store.root,'runs',result.id,'result.json'),'utf8'));
        outcome={result:persisted,visionSha256:hash(visionBytes),scope:'direct common executor with research-only target; UI/MCP admission remains read-only'};
      }finally{await hid.close();}
    }
    else if (verb === 'recognize' || verb === 'open-menu' || verb === 'close-menu' || verb === 'party-calibrate' || verb==='cursor-up' || verb==='cursor-down') {
      const visionBytes = await readFile(join(root,'vision-v4.json'));
      const vision=visionSchema.parse(JSON.parse(visionBytes.toString()));
      const see = async (suffix:string) => {
        const shot=await capture(native,suffix);
        if(!shot.observation.image) throw new Error('No pixels');
        return {frame:shot.timed, recognition:recognize(await decodeFnafPng(fnaf,shot.observation.image),vision)};
      };
      const before=await see('before');
      if (verb==='recognize') outcome={before,visionSha256:hash(visionBytes)};
      else {
        const expected=verb==='open-menu'?'overworld':verb==='cursor-down'?'UNKNOWN':'menu-pokemon';
        if(before.recognition.state!==expected) throw new Error(`Refused contact: expected ${expected}, observed ${before.recognition.state}`);
        if(verb==='cursor-down'&&before.recognition.reason!=='pokemon-cursor-not-confirmed')throw new Error('Down recovery requires known menu with failed cursor gate');
        const witness=await capture(physical,'witness');
        z.object({width:z.literal(1080),height:z.literal(2400),foregroundPackage:z.literal('com.fastemulator.gbc')}).parse(witness.observation.facts);
        const reference=await decodeFnafPng(fnaf,await readFile(join(root,'003-baseline-before.png')));
        if(!witness.observation.image) throw new Error('No witness');
        const drift=difference(reference,await decodeFnafPng(fnaf,witness.observation.image),[20,1460,1020,2020]);
        if(drift>1) throw new Error(`Physical controls drift ${drift}`);
        const point=verb==='open-menu'?{x:748,y:1555}:verb==='party-calibrate'?{x:883,y:1940}:verb==='cursor-up'?{x:222,y:1700}:verb==='cursor-down'?{x:222,y:1940}:{x:650,y:1825};
        const hid=await openPortraitHid(fnaf,serial);
        let contact:unknown;
        try{await reserveContact();contact=await hid.contact(point.x,point.y,150,signal);}finally{await hid.close();}
        const after=await see('after');
        outcome={before,witness:witness.timed,drift,point,contact,nominalHoldMs:150,inputBackend:'original-fnaf-hid-portrait-research',after,visionSha256:hash(visionBytes)};
      }
    }
    else if (verb === 'prepare' || verb === 'stop') {
      const helper = join(fnaf,'packages/play/bin/companion/companion-setup.py');
      const code = `import importlib.util,sys; spec=importlib.util.spec_from_file_location("original_setup",sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); m.${verb === 'prepare' ? 'start_capture("")' : 'stop_capture()'}`;
      const result = await exec('python3', ['-c', code, helper], { signal, timeout:25000, maxBuffer:1024*1024 });
      outcome = { output: result.stdout.trim(), frame: (await capture(physical,'after')).timed };
    } else if (verb === 'home') {
      const prior=(await readdir(root)).filter(file=>file.endsWith('-operation.json'));
      let count=0;for(const file of prior){const row=z.object({verb:z.string()}).parse(JSON.parse(await readFile(join(root,file),'utf8')));if(row.verb==='home')count++;}
      if(count>=3)throw new Error('Home budget exhausted');
      const before = await capture(physical, 'before');
      if (before.observation.facts['foregroundPackage'] !== 'com.fastemulator.gbc') throw new Error('Home requires emulator foreground');
      await adb('shell','input','keyevent','KEYCODE_HOME'); outcome = (await capture(physical,'after')).timed;
    } else if (verb === 'resume') {
      const result = await adb('shell','am','start','-W','-n','com.fastemulator.gbc/.RomListActivity','-f','0x10200000');
      outcome = { output:result.stdout.trim(), frame:(await capture(physical,'after')).timed };
    } else throw new Error('Closed research verb not supported');
  } catch (cause: unknown) { error = (cause instanceof Error ? cause.message : String(cause)).replaceAll(serial,hash(serial).slice(0,16)); process.exitCode = 1; }
  const record = { schema:'operator-pokemon-round2/v1', deviceId:hash(serial).slice(0,16), verb,label,startedAt,startedAtMs,endedAtMs:performance.now(),
    hostClock:'host-monotonic', instrument,source,build,outcome,error };
  await writeFile(join(root, `${label}-operation.json`), JSON.stringify(record,null,2), { flag:'wx' });
  const run=z.object({result:z.object({id:z.string(),planHash:z.string(),verdict:z.string(),steps:z.array(z.object({nodeId:z.string(),verdict:z.string(),dispatched:z.boolean()}))})}).safeParse(outcome);
  console.log(JSON.stringify({ label,verb,outcome:run.success?run.data:outcome,error }));
}
