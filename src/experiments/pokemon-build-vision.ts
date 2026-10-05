import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { configuredFnafRoot } from '../device/fnaf.js';
import { decodeFnafPng } from '../device/fnaf-png.js';
import { hash } from '../core/identity.js';
import { samples, visionSchema } from './pokemon-vision.js';

const root=resolve('.operator/experiments/pokemon-round2-20261005');
await mkdir(root,{recursive:true});
const version=process.argv[2]??'v1';
if(!['v1','v2','v3','v4'].includes(version)) throw new Error('Closed version');
const paths:Record<string,string>={overworld:join(root,'003-baseline-native.png'), 'menu-pokemon':'.operator/experiments/pokemon-20261005/020-start-held-a-after.png'};
if(version!=='v1') for(const label of ['006-return-a','007-settled-a','010-return-b','011-settled-b']) paths[`overworld:${label}`]=join(root,`${label}-native.png`);
if(version==='v3'||version==='v4') paths['party']=join(root,'017-party-settled-native.png');
const sourceFrames:Record<string,string>={}, states=[];
let controls:number[]=[],pokemonCursor:number[]=[];
for (const [state,path] of Object.entries(paths)) {
  const bytes=await readFile(path), frame=await decodeFnafPng(configuredFnafRoot(),bytes);
  sourceFrames[state]=hash(bytes);states.push({state:state.split(':')[0],pixels:samples(frame,'game')});
  if(state==='overworld') controls=samples(frame,'controls');
  if(state==='menu-pokemon') pokemonCursor=samples(frame,'cursor');
}
const vision=visionSchema.parse({schema:'operator-pokemon-vision/v1',sourceFrames,controls,states,...(version==='v4'?{pokemonCursor}:{}),limits:{controlsMeanAbs:2,stateMeanAbs:6,margin:4}});
const bytes=JSON.stringify(vision,null,2)+'\n';
await writeFile(join(root,`vision-${version}.json`),bytes,{flag:'wx'});
console.log(JSON.stringify({visionSha256:hash(bytes),sourceFrames,limits:vision.limits}));
