import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PokemonResearchTarget } from '../experiments/pokemon-research-target.js';
import { samples, recognize } from '../experiments/pokemon-vision.js';
import type { Vision } from '../experiments/pokemon-vision.js';
import type { GrayFrame } from '../device/fnaf-png.js';
import type { Observation } from '../core/port.js';

function frame(width=2400,height=1080,value=0):GrayFrame{return{width,height,gray:new Uint8Array(width*height).fill(value)};}
function setup(drift=false,ambiguous=false){
  const n=frame(),p=frame(1080,2400),changed=frame(1080,2400,drift?50:0);
  const vision:Vision={schema:'operator-pokemon-vision/v1',sourceFrames:{},controls:samples(n,'controls'),pokemonCursor:samples(n,'cursor'),
    states:[{state:'overworld',pixels:samples(n,'game')},{state:'menu-pokemon',pixels:samples(frame(2400,1080,ambiguous?0:100),'game')}],
    limits:{controlsMeanAbs:2,stateMeanAbs:6,margin:4}};
  let dispatches=0,reservations=0;
  const physical:Observation={id:'physical',clock:'host-monotonic',receivedAtMs:1,facts:{width:1080,height:2400,foregroundPackage:'com.fastemulator.gbc'}};
  const native:Observation={id:'native',clock:'host-monotonic',receivedAtMs:2,facts:{width:2400,height:1080}};
  const target=new PokemonResearchTarget(vision,p,async()=>({native,physical,nativePixels:n,physicalPixels:changed}),
    {contact:async(x,y,holdMs)=>{dispatches++;return{physical:{x,y},logicalLandscape:{x:y,y:1080-x},raw:{x:0,y:0},nominalHoldMs:holdMs};},close:async()=>{}},
    async()=>{reservations++;});
  return{target,vision,n,counts:()=>({dispatches,reservations})};
}
test('physical controls drift blocks contact even with matching native state',async()=>{
  const s=setup(true),signal=new AbortController().signal;
  const o=await s.target.observe(signal);assert.equal(o.facts['geometryQualified'],false);assert.equal(o.facts['pokemonState'],undefined);
  await assert.rejects(s.target.tap(748,1555,150,signal),/binding refused/);
  assert.deepEqual(s.counts(),{dispatches:0,reservations:0});
});
test('ambiguous state, unqualified duration and unrelated point do not spend input budget',async()=>{
  const s=setup(false,true),signal=new AbortController().signal;
  assert.equal(recognize(s.n,s.vision).state,'UNKNOWN');
  await assert.rejects(s.target.tap(748,1555,150,signal),/binding refused/);
  await assert.rejects(s.target.tap(748,1555,20,signal),/duration/);
  const valid=setup();await assert.rejects(valid.target.tap(300,800,150,signal),/binding refused/);
  assert.deepEqual(s.counts(),{dispatches:0,reservations:0});assert.deepEqual(valid.counts(),{dispatches:0,reservations:0});
});
test('animation reference bank compares margins between states, not two samples of one state',()=>{
  const s=setup();s.vision.states.push({...s.vision.states[0]!});
  assert.equal(recognize(s.n,s.vision).state,'overworld');
  assert.equal(recognize(frame(1080,2400),s.vision).state,'UNKNOWN');
});
test('menu similarity cannot approve A when the selection arrow changes',()=>{
  const n=frame(),vision:Vision={schema:'operator-pokemon-vision/v1',sourceFrames:{},controls:samples(n,'controls'),pokemonCursor:samples(n,'cursor'),
    states:[{state:'menu-pokemon',pixels:samples(n,'game')}],limits:{controlsMeanAbs:2,stateMeanAbs:6,margin:4}};
  assert.equal(recognize(n,vision).state,'menu-pokemon');
  for(let y=288;y<317;y++)for(let x=1224;x<1247;x++)n.gray[y*n.width+x]=255;
  assert.equal(recognize(n,vision).reason,'pokemon-cursor-not-confirmed');
});
