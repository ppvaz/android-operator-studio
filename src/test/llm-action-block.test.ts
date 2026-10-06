import {test} from 'node:test';
import assert from 'node:assert/strict';
import {goldRequestSchema,plannedActions} from '../experiments/llm-action-block.js';
const base={frame:'g215-1.png',scene:'Verified stable menu',reasoning:'Bounded situational sequence',action:'Down'};
test('mixed action block keeps first review and records later actions as inference',()=>{
 const actions=plannedActions(goldRequestSchema.parse({...base,holdMs:'600',followUps:[{action:'Left',holdMs:'1000'},{action:'A',holdMs:'50'}]}));
 assert.deepEqual(actions.map(s=>[s.action,s.holdMs,s.basis]),[['Down',600,'visual'],['Left',1000,'inferred'],['A',50,'inferred']]);
});
test('invalid mixed blocks are rejected before opening a physical transport',()=>{
 for(const value of [{...base,repeat:2},{...base,repeat:2,followUps:[{action:'A'}]},{...base,action:'A',holdMs:'600'},
  {...base,action:'A',repeat:3,settleMs:6000},{...base,followUps:Array.from({length:8},()=>({action:'A'}))},{...base,followUps:[{action:'shell',command:'anything'}]}]){
  assert.throws(()=>plannedActions(goldRequestSchema.parse(value)));
 }
 assert.equal(plannedActions(goldRequestSchema.parse({...base,action:'A',repeat:8,settleMs:1000})).length,8);
});
