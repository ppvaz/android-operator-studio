import {z} from 'zod';
const action=z.enum(['A','B','Up','Down','Left','Right','Start','Select']);
const hold=z.enum(['50','75','100','150','600','1000']);
const step=z.strictObject({action,holdMs:hold.optional(),settleMs:z.number().int().min(500).max(8000).optional(),scene:z.string().min(1).optional()});
export const goldRequestSchema=z.strictObject({
 frame:z.string().regex(/^[a-z0-9-]+-\d+\.png$/),basis:z.enum(['visual','inferred']).default('visual'),
 scene:z.string().min(1),reasoning:z.string().min(1),action,holdMs:hold.optional(),
 repeat:z.number().int().min(1).max(8).default(1),followUps:z.array(step).max(7).default([]),
 capture:z.enum(['each','end']).default('end'),
 settleMs:z.number().int().min(500).max(8000).optional(),pauseAfter:z.boolean().default(true),
 previousOutcome:z.enum(['PASS','FAIL','UNKNOWN']).optional(),previousEvidence:z.string().optional(),
});
export function plannedActions(request:z.infer<typeof goldRequestSchema>){
 if(request.repeat>1&&(request.followUps.length>0||request.action!=='A'))throw new Error('Repeat requires A only and cannot combine with followUps');
 const input=request.followUps.length?[request,...request.followUps]:Array.from({length:request.repeat},()=>request);
 const actions=input.map((s,i)=>({action:s.action,holdMs:Number(s.holdMs??'150'),settleMs:s.settleMs??(s.action==='A'?2200:500),
  scene:i===0?request.scene:(s.scene??`Inferred continuation: ${request.scene}`),basis:i===0?request.basis:'inferred' as const}));
 if(actions.length>8||actions.reduce((sum,s)=>sum+s.settleMs,0)>12000)throw new Error('Action block exceeds contact or wait budget');
 for(const s of actions)if(s.holdMs>150&&!['Up','Down','Left','Right'].includes(s.action))throw new Error('Long hold is navigation-only');
 return actions;
}
