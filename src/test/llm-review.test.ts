import {test} from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {LlmReviewTarget,deferredObservation} from '../experiments/llm-review-target.js';
import {execute} from '../core/runtime.js';
import {parsePlan} from '../core/plan.js';
import type {Observation} from '../core/port.js';
const plan=parsePlan({schema:'operator-plan/v1',name:'Bounded LLM action',entry:'contact',maxSteps:1,timeoutMs:1000,nodes:[{id:'contact',label:'reviewed contact',kind:'tap',deadlineMs:900,x:10,y:20,holdMs:75,before:{fact:'sceneReviewed',equals:true},after:{fact:'resultReviewed',equals:true},next:{}}]});
function setup(options:{id?:string;age?:number;rejectGuard?:boolean;basis?:'visual'|'inferred'}={}){
 const initial:Observation={id:'frame',clock:'host-monotonic',receivedAtMs:performance.now()-(options.age??0),facts:{}};
 let contacts=0;const target=new LlmReviewTarget(initial,{observationId:options.id??initial.id,scene:'map',reasoning:'qualified contact',action:'Left',basis:options.basis??'visual'},async()=>({...initial,id:'after',receivedAtMs:performance.now()}),async()=>{contacts++;},async()=>{if(options.rejectGuard)throw new Error('foreground drift');});
 return{target,contacts:()=>contacts};
}
test('LLM research transport completion remains UNKNOWN until resulting image is reviewed',async()=>{
 const s=setup();const r=await execute(plan,s.target);assert.equal(s.contacts(),1);assert.equal(r.verdict,'UNKNOWN');assert.equal(r.steps[0]?.dispatched,true);
 await assert.rejects(s.target.tap(10,20,75,new AbortController().signal),/second action/);
});
test('wrong, expired, cancelled or foreground-drifted visual decision cannot dispatch',async()=>{
 for(const options of [{id:'other'},{age:91000},{rejectGuard:true}]){
  const s=setup(options),r=await execute(plan,s.target);assert.equal(s.contacts(),0);assert.equal(r.verdict,'UNKNOWN');
 }
 const s=setup(),c=new AbortController();c.abort();const r=await execute(plan,s.target,c.signal);assert.equal(s.contacts(),0);assert.equal(r.verdict,'CANCELLED');
});
test('inferred continuation has explicit provenance and does not assert a newly observed scene',async()=>{
 const s=setup({basis:'inferred'}),o=await s.target.observe(new AbortController().signal);assert.equal(o.evidence?.['reviewer'],'session-LLM-inference');assert.equal(o.evidence?.['reviewIsFreshCapture'],false);
});
test('deferred capture preserves old frame time and completes UNKNOWN without polling a stale result',async()=>{
 const initial:Observation={id:'old-frame',clock:'host-monotonic',receivedAtMs:performance.now(),facts:{resultReviewed:false,sceneReviewed:true},image:Buffer.from('old pixels')};
 let reads=0,contacts=0;
 const target=new LlmReviewTarget(initial,{observationId:initial.id,scene:'safe dialogue',reasoning:'declared block',action:'A',basis:'inferred'},async()=>{reads++;return deferredObservation(initial);},async()=>{contacts++;},async()=>{});
 const r=await execute(plan,target),after=r.steps[0]?.observations[1];
 assert.equal(r.verdict,'UNKNOWN');assert.equal(reads,1);assert.equal(contacts,1);
 assert.equal(after?.id,initial.id);assert.equal(after?.receivedAtMs,initial.receivedAtMs);assert.equal(after?.image,initial.image);
 assert.equal(after?.facts['captureDeferred'],true);assert.equal(after?.facts['resultReviewed'],undefined);assert.equal(after?.evidence?.['reviewIsFreshCapture'],false);
});
