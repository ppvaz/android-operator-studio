import type { Target, Observation } from '../core/port.js';
import type { GrayFrame } from '../device/fnaf-png.js';
import { difference } from '../device/fnaf-png.js';
import { recognize } from './pokemon-vision.js';
import type { Vision } from './pokemon-vision.js';
import type { openPortraitHid } from './fnaf-portrait-hid.js';

export class PokemonResearchTarget implements Target {
  readonly name='pokemon-red-gym-menu-research';
  readonly level='DEVICE_MEASURED';
  constructor(private readonly vision:Vision,private readonly reference:GrayFrame,
    private readonly capture:(signal:AbortSignal)=>Promise<{native:Observation,physical:Observation,nativePixels:GrayFrame,physicalPixels:GrayFrame}>,
    private readonly hid:Awaited<ReturnType<typeof openPortraitHid>>,private readonly reserveContact:()=>Promise<void>){
    if(!vision.pokemonCursor)throw new Error('Old research vision lacks the Pokemon cursor gate; retired from live input');
  }
  async observe(signal:AbortSignal):Promise<Observation>{
    const shot=await this.capture(signal), prediction=recognize(shot.nativePixels,this.vision);
    const physical=shot.physical;
    const geometry=physical.facts['width']===1080&&physical.facts['height']===2400;
    const drift=geometry?difference(this.reference,shot.physicalPixels,[20,1460,1020,2020]):Infinity;
    const qualified=geometry&&drift<=1&&prediction.controlsMeanAbs<=this.vision.limits.controlsMeanAbs;
    const observation:Observation={...shot.native,facts:{...shot.native.facts,geometryQualified:qualified},
      evidence:{recognition:prediction,physicalWitness:{id:physical.id,facts:physical.facts,receivedAtMs:physical.receivedAtMs},physicalControlsMeanAbs:drift,sequentialWitnesses:true}};
    const foreground=physical.facts['foregroundPackage'];
    if(foreground!==undefined) observation.facts['foregroundPackage']=foreground;
    if(qualified&&foreground==='com.fastemulator.gbc'&&prediction.state!=='UNKNOWN') observation.facts['pokemonState']=prediction.state;
    return observation;
  }
  async tap(x:number,y:number,holdMs:number,signal:AbortSignal):Promise<void>{
    if(holdMs!==150)throw new Error('Unqualified contact duration');
    // Fresh port-side check closes the gap after the runtime precondition.
    const observation=await this.observe(signal), state=observation.facts['pokemonState'];
    const allowed=x===748&&y===1555&&state==='overworld'
      ||x===883&&y===1940&&state==='menu-pokemon'
      ||x===650&&y===1825&&(state==='party'||state==='menu-pokemon');
    if(!allowed||observation.facts['geometryQualified']!==true) throw new Error('Research control/state binding refused');
    await this.reserveContact();
    await this.hid.contact(x,y,holdMs,signal);
  }
}
