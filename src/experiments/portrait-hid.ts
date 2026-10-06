import {AdbHidProcess,HidWireTransport} from '@android-operator/device';
// Closed portrait research profile. Bounds are not generic device qualification.
export async function openResearchPortraitHid(serial:string,points:readonly (readonly [number,number])[],contactMs:number,allowedContactMs:readonly number[]=[contactMs]){
  if(!points.length||points.some(([x,y])=>!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=1080||y<0||y>=2400)
    ||!Number.isInteger(contactMs)||contactMs<50||contactMs>1000||!allowedContactMs.length
    ||allowedContactMs.some(ms=>!Number.isInteger(ms)||ms<50||ms>1000))throw new Error('Invalid bounded research contact profile');
  const process=new AdbHidProcess({serial,readyTimeoutMs:10000});
  const wire=new HidWireTransport({write:line=>process.write(line),ready:()=>process.ready(),contactMs});
  return {
    async contact(x:number,y:number,holdMs:number,signal:AbortSignal) {
      signal.throwIfAborted();
      if(!allowedContactMs.includes(holdMs) || !points.some(([px,py])=>x===px&&y===py)) throw new Error('Contact outside frozen research controls');
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
