import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

export const HID_SOURCES=['packages/play/src/venues/phone/hid.ts','packages/play/src/campaign/physical-ports.ts'] as const;
interface Process { write(line:string):Promise<void>; ready():Promise<void>; close():Promise<void> }
interface Wire { send(input:{command:{action:{kind:'press',durationMs:number}},point:{x:number,y:number}}):Promise<unknown>; releaseAll():Promise<void>;abort():Promise<void> }
type ProcessConstructor=new(options:{serial:string,readyTimeoutMs:number})=>Process;
type WireConstructor=new(options:{write:(line:string)=>Promise<void>,ready:()=>Promise<void>,contactMs:number})=>Wire;
// Research only: portrait mapping is a hypothesis qualified by menu effects.
// No generic action API or admission through UI/MCP is granted here.
export async function openPortraitHid(root:string,serial:string) {
  return openResearchPortraitHid(root,serial,[[748,1555],[650,1825],[883,1940],[222,1700],[222,1940]],150);
}
// A research caller must qualify and freeze its own control/state bindings.
// This does not expose contacts through the product's read-only backends.
export async function openResearchPortraitHid(root:string,serial:string,points:readonly (readonly [number,number])[],contactMs:number) {
  if(!points.length||points.some(([x,y])=>!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=1080||y<0||y>=2400)
    ||!Number.isInteger(contactMs)||contactMs<50||contactMs>1000)throw new Error('Invalid bounded research contact profile');
  const h:unknown=await import(pathToFileURL(join(root,HID_SOURCES[0])).href);
  const p:unknown=await import(pathToFileURL(join(root,HID_SOURCES[1])).href);
  const Hid=z.object({HidWireTransport:z.custom<WireConstructor>(value=>typeof value==='function')}).parse(h).HidWireTransport;
  const Adb=z.object({AdbHidProcess:z.custom<ProcessConstructor>(value=>typeof value==='function')}).parse(p).AdbHidProcess;
  const process=new Adb({serial,readyTimeoutMs:3000});
  const wire=new Hid({write:line=>process.write(line),ready:()=>process.ready(),contactMs});
  return {
    async contact(x:number,y:number,holdMs:number,signal:AbortSignal) {
      signal.throwIfAborted();
      if(holdMs!==contactMs || !points.some(([px,py])=>x===px&&y===py)) throw new Error('Contact outside frozen research controls');
      // Inverse of FNaF's landscape -> portrait-natural transform. Image
      // coordinates are not HID coordinates; first use physical portrait.
      const mapped={x:y,y:1080-x};
      const abort=()=>{void wire.abort().catch(()=>{});};
      signal.addEventListener('abort',abort,{once:true});
      try { await wire.send({command:{action:{kind:'press',durationMs:holdMs}},point:mapped}); signal.throwIfAborted(); }
      finally {signal.removeEventListener('abort',abort);await wire.releaseAll();}
      return {physical:{x,y},logicalLandscape:mapped,raw:{x:Math.floor(x*20/9),y:Math.floor(y*9/20)},nominalHoldMs:holdMs};
    },
    async close(){try{await wire.releaseAll();}finally{await process.close();}},
  };
}
