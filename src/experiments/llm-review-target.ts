import type { Observation, Target } from '../core/port.js';
import { performance } from 'node:perf_hooks';

export interface VisualReview {
  observationId:string;
  scene:string;
  reasoning:string;
  action:string;
  basis?:'visual'|'inferred';
}
// Review provenance is explicit. Neither the transport nor a cached review
// supplies a verdict about the resulting scene. A controller must inspect it.
export class LlmReviewTarget implements Target {
  readonly name='llm-supervised-research';
  readonly level='DEVICE_MEASURED';
  private dispatched=false;
  constructor(private readonly initial:Observation,private readonly review:VisualReview,
    private readonly capture:(signal:AbortSignal)=>Promise<Observation>,
    private readonly contact:(x:number,y:number,holdMs:number,signal:AbortSignal)=>Promise<void>,
    private readonly guard:(signal:AbortSignal)=>Promise<void>) {}
  async observe(signal:AbortSignal):Promise<Observation>{
    signal.throwIfAborted();
    if(this.dispatched)return this.capture(signal);
    if(this.initial.id!==this.review.observationId)throw new Error('Visual review does not bind this frame');
    if(performance.now()-this.initial.receivedAtMs>90000)throw new Error('Visual review expired');
    return {...this.initial,facts:{...this.initial.facts,sceneReviewed:true},
      evidence:{...this.initial.evidence,visualReview:this.review,reviewer:this.review.basis==='inferred'?'session-LLM-inference':'session-LLM-visual',reviewIsFreshCapture:false}};
  }
  async tap(x:number,y:number,holdMs:number,signal:AbortSignal):Promise<void>{
    if(this.dispatched)throw new Error('A second action requires a new visual review');
    await this.guard(signal);
    this.dispatched=true;
    await this.contact(x,y,holdMs,signal);
  }
}
