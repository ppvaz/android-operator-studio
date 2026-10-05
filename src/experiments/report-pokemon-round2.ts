// Offline audit: no phone calls; retain hashes and measurements, never media.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { hash } from '../core/identity.js';
import { configuredFnafRoot } from '../device/fnaf.js';
import { decodeFnafPng } from '../device/fnaf-png.js';
import { recognize, visionSchema, stateSchema } from './pokemon-vision.js';

const root='.operator/experiments/pokemon-round2-20261005';
const schema=z.object({label:z.string(),verb:z.string(),deviceId:z.string(),startedAt:z.string(),instrument:z.record(z.string(),z.string()),
  source:z.object({revision:z.string(),sources:z.record(z.string(),z.string())}),build:z.object({emulator:z.object({versionCode:z.string(),versionName:z.string()}),model:z.string()}).optional(),outcome:z.unknown().optional(),error:z.string().optional()});
const operations:{file:string,sha256:string,record:z.infer<typeof schema>}[]=[];
for(const file of (await readdir(root)).filter(file=>file.endsWith('-operation.json')).sort()) {
  const bytes=await readFile(join(root,file)),record=schema.parse(JSON.parse(bytes.toString()));
  for(const digest of Object.values(record.instrument)) assert.equal(hash(await readFile(join(root,'instrument',digest))),digest,'Archived instrument must match');
  operations.push({file,sha256:hash(bytes),record});
}
function operation(label:string){const value=operations.find(item=>item.record.label===label);assert.ok(value,`Missing ${label}`);return value.record;}
const runSchema=z.object({result:z.object({id:z.string(),planHash:z.string(),level:z.literal('DEVICE_MEASURED'),verdict:z.string(),startedAt:z.string(),
  steps:z.array(z.object({nodeId:z.string(),verdict:z.string(),dispatched:z.boolean(),startedAtMs:z.number(),endedAtMs:z.number(),observations:z.array(z.unknown())}).passthrough())})});
const runtime=['018-runtime-cleanup','019-runtime-from-map','021-runtime-from-menu','023-runtime-on-home'].map(label=>({label,...runSchema.parse(operation(label).outcome)}));
assert.deepEqual(runtime.map(run=>run.result.verdict),['PASS','PASS','PASS','FAIL']);
assert.equal(runtime[1]?.result.planHash,runtime[2]?.result.planHash);assert.equal(runtime[1]?.result.planHash,runtime[3]?.result.planHash);
assert.equal(runtime[1]?.result.steps.filter(step=>step.dispatched).length,4);
assert.equal(runtime[2]?.result.steps.filter(step=>step.dispatched).length,3);
assert.equal(runtime[3]?.result.steps.filter(step=>step.dispatched).length,0);
const bracketSchema=z.object({metrics:z.object({adbControlsMeanAbs:z.number(),adbTopMeanAbs:z.number(),nativeControlsMeanAbs:z.number(),nativeTopMeanAbs:z.number()}).passthrough()}).passthrough();
const brackets=operations.filter(item=>item.record.verb==='bracket').map(item=>({label:item.record.label,...bracketSchema.parse(item.record.outcome)}));
assert.equal(brackets.length,6);
for(const bracket of brackets){assert.equal(bracket.metrics.adbControlsMeanAbs,0);assert.equal(bracket.metrics.adbTopMeanAbs,0);assert.ok(bracket.metrics.nativeControlsMeanAbs<8);}
const labels=z.object({cases:z.array(z.object({vision:z.enum(['v1','v2','v3']),file:z.string(),expected:z.union([stateSchema,z.literal('UNKNOWN')]),witness:z.string().optional()}).passthrough()),limitations:z.string()})
  .parse(JSON.parse(await readFile('docs/experiments/POKEMON-ROUND2-20261005.holdout.json','utf8')));
const validation=[];
for(const row of labels.cases){
  const visionBytes=await readFile(join(root,`vision-${row.vision}.json`));
  const vision=visionSchema.parse(JSON.parse(visionBytes.toString())),bytes=await readFile(join(root,row.file));
  const prediction=recognize(await decodeFnafPng(configuredFnafRoot(),bytes),vision);
  validation.push({...row,frameSha256:hash(bytes),visionSha256:hash(visionBytes),prediction,matched:row.expected===prediction.state,
    identicalToTrainingFrame:Object.values(vision.sourceFrames).includes(hash(bytes)),
    ...(row.witness?{witnessSha256:hash(await readFile(join(root,row.witness)))}:{})});
}
// Keep the first version's false rejection; never turn it into a success.
assert.equal(validation[0]?.matched,false);assert.equal(validation[0]?.prediction.state,'UNKNOWN');
assert.ok(validation.slice(1).every(row=>row.matched));
const original='.operator/experiments/pokemon-20261005';
const oldFiles=['012-native-pokemon-frame.png','017-dismiss-door-after.png','018-start-short-a-after.png','020-start-held-a-after.png','021-close-held-a-after.png','026-final-native-frame.png'];
const auditCode='import sys,json,PIL\nfrom PIL import Image,ImageChops,ImageStat\nbase=Image.open(sys.argv[1]).convert("RGB"); box=(965,675,1430,1030)\nrows=[]\nfor path in sys.argv[2:]:\n im=Image.open(path).convert("RGB"); d=ImageChops.difference(base.crop(box),im.crop(box)); rows.append({"file":path,"rgbMeanAbs":ImageStat.Stat(d).mean,"rgbExtrema":d.getextrema()})\nprint(json.dumps({"pillowVersion":PIL.__version__,"nativeControlsBox":box,"rows":rows}))';
const rgbResult=await promisify(execFile)('python3',['-c',auditCode,join(root,'003-baseline-native.png'),...oldFiles.map(file=>join(original,file))],{timeout:10000,maxBuffer:100000});
const rgbAudit=z.object({pillowVersion:z.string(),nativeControlsBox:z.array(z.number()),rows:z.array(z.object({file:z.string(),rgbMeanAbs:z.array(z.number()),rgbExtrema:z.array(z.array(z.number()))}))}).parse(JSON.parse(rgbResult.stdout));
for(const row of rgbAudit.rows){assert.deepEqual(row.rgbMeanAbs,[0,0,0]);assert.ok(row.rgbExtrema.flat().every(value=>value===0));}
const oldRecord=z.object({withheldMedia:z.array(z.object({file:z.string(),sha256:z.string()}))}).parse(JSON.parse(await readFile('docs/evidence/pokemon-experiments-20261005.json','utf8')));
for(const file of oldFiles)assert.equal(hash(await readFile(join(original,file))),oldRecord.withheldMedia.find(row=>row.file===file)?.sha256,'Reaudit the original retained PNG');
const final=z.object({projectionActive:z.literal(false),researchHidPresent:z.literal(false),frame:z.object({facts:z.object({foregroundPackage:z.literal('com.fastemulator.gbc')})}).passthrough()}).parse(operation('026-final-inspection').outcome);
const contactIntents=(await readdir(root)).filter(file=>file.endsWith('.contact')&&!file.startsWith('p3-')).length+2;
assert.equal(contactIntents,12);
const phase3Runtime=['p3-006-refuse-a','p3-008-runtime'].map(label=>({label,...runSchema.parse(operation(label).outcome)}));
assert.deepEqual(phase3Runtime.map(run=>run.result.verdict),['UNKNOWN','PASS']);
assert.equal(phase3Runtime[0]?.result.steps.filter(step=>step.dispatched).length,0);
assert.equal(phase3Runtime[1]?.result.steps.filter(step=>step.dispatched).length,3);
assert.equal(phase3Runtime[1]?.result.planHash,runtime[1]?.result.planHash);
const phase3Contacts=(await readdir(root)).filter(file=>file.startsWith('p3-')&&file.endsWith('.contact')).length;
assert.equal(phase3Contacts,6);
const phase3Final=z.object({projectionActive:z.literal(false),researchHidPresent:z.literal(false),frame:z.unknown()}).parse(operation('p3-010-final').outcome);
assert.match(operation('p3-004-menu').error??'',/expected overworld, observed UNKNOWN/);
const cursorUp=z.object({after:z.object({recognition:z.object({state:z.literal('UNKNOWN'),reason:z.literal('pokemon-cursor-not-confirmed'),controlsMeanAbs:z.literal(0),scores:z.array(z.object({state:z.string(),meanAbs:z.number()}))})}),visionSha256:z.string()}).parse(operation('p3-005-cursor-up').outcome);
assert.equal(cursorUp.visionSha256,hash(await readFile(join(root,'vision-v4.json'))));
assert.ok((cursorUp.after.recognition.scores.find(s=>s.state==='menu-pokemon')?.meanAbs??Infinity)<6);
const media=[];
for(const file of (await readdir(root)).filter(file=>file.endsWith('.png')).sort()){
  const bytes=await readFile(join(root,file));media.push({file,sha256:hash(bytes),bytes:bytes.length});
}
const config=[];
for(const version of ['v1','v2','v3','v4']){const bytes=await readFile(join(root,`vision-${version}.json`));const vision=visionSchema.parse(JSON.parse(bytes.toString()));config.push({version,sha256:hash(bytes),sourceFrames:vision.sourceFrames,limits:vision.limits,cursorGate:Boolean(vision.pokemonCursor)});}
const hardenedBytes=await readFile(join(root,'vision-v4.json')),hardened=visionSchema.parse(JSON.parse(hardenedBytes.toString()));
const cursorAudit=[];
for(const row of validation.filter(row=>row.vision==='v3'&&row.expected==='menu-pokemon')){
  const prediction=recognize(await decodeFnafPng(configuredFnafRoot(),await readFile(join(root,row.file))),hardened);
  assert.equal(prediction.state,'menu-pokemon');cursorAudit.push({file:row.file,prediction});
}
function sanitize(value:unknown):unknown{
  if(typeof value==='string')return value.replaceAll(resolve('..'),'<workspace>').replace(/\/Users\/[^\s]+/g,'<host-path>');
  if(Array.isArray(value))return value.map(sanitize);
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[String(sanitize(key)),sanitize(item)]));return value;
}
const inputs=operations.map(item=>({file:item.file,sha256:item.sha256,label:item.record.label,verb:item.record.verb,startedAt:item.record.startedAt,
  instrumentManifestSha256:hash(JSON.stringify(item.record.instrument)),archivedFiles:Object.keys(item.record.instrument).length,build:item.record.build,error:item.record.error}));
const payload={schema:'operator-pokemon-round2-evidence/v1',deviceId:operations[0]?.record.deviceId,level:'DEVICE_MEASURED',source:operations.at(-1)?.record.source,
  reportInstrumentSha256:hash(await readFile('src/experiments/report-pokemon-round2.ts')),inputs,brackets,vision:config,validation,
  correction:{claim:'Controls absent from old PNGs is retracted: all pixels in this ROI are RGB-identical to the complete baseline',auditCodeSha256:hash(auditCode),
    baselineSha256:hash(await readFile(join(root,'003-baseline-native.png'))),rgbAudit,oldMedia:await Promise.all(oldFiles.map(async file=>({file,sha256:hash(await readFile(join(original,file)))})))},
  runtime,cursorHardening:{visionSha256:hash(hardenedBytes),nativeCursorBox:[1224,288,1247,317],meanAbsLimit:2,retrospectiveAudit:cursorAudit,
    reason:'Whole-menu average can miss cursor changes. V3 is retired from live input; V4 requires an additional cursor ROI.'},
  contacts:{initialPhase:contactIntents,phase3:phase3Contacts,totalMenuContacts:contactIntents+phase3Contacts,diagnosticAdb:1,originalFnafHid:17,romSelectionAdb:1,nominalHoldMs:150},final:phase3Final,initialPhaseFinal:final,
  phase3:{runtime:phase3Runtime,cursorUp:cursorUp.after.recognition,visionSha256:cursorUp.visionSha256,coldResumeRefusal:operation('p3-004-menu').error,prepareFailureRetained:operation('p3-002-prepare').error},media,
  limits:['One device, emulator build and existing save/scene; same-session temporal holdout','Agent labels and sequential witnesses, not blinded independent ground truth',labels.limitations,
    'Native geometry/input mapping is scoped; device and host clocks are unmapped','UI/MCP live contacts remain refused; research port uses the common executor directly',
    'Initial live runs used v3 without a dedicated cursor ROI; selected item was agent-reviewed in this scene. V3 is retired from input',
    'Initial phase did not automatically pin emulator build/settings in the port. Reconnection harness adds device and emulator-build checks; control settings still require qualification',
    'Phase3 used fresh Android UI semantics for one named ROM selection; no pixel ROM-list/dialogue detector, general process-death recovery, save editing, battle, movement or input landing latency qualification in this round',
    'Media, reference vectors, compiled/source instrument archives and original operation records stay local under .operator; Git retains hashes and results']};
const sanitized=sanitize(payload);const evidenceId=`pokemon-round2-${hash(JSON.stringify(sanitized)).slice(0,16)}`;
await writeFile('docs/evidence/pokemon-round2-20261005.json',JSON.stringify({evidenceId,...z.record(z.string(),z.unknown()).parse(sanitized)},null,2)+'\n');
console.log(JSON.stringify({evidenceId,operations:operations.length,brackets:brackets.length,contactIntents,runtime:runtime.map(item=>({label:item.label,verdict:item.result.verdict,contacts:item.result.steps.filter(step=>step.dispatched).length})),
  validation:validation.map(row=>({file:row.file,expected:row.expected,actual:row.prediction.state,matched:row.matched,identicalToTrainingFrame:row.identicalToTrainingFrame})),media:media.length,final}));
