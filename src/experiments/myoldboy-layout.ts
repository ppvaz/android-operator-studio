// Emulator adapter, not a Pokémon screen detector. Bounds come from layout XML
// and the current Android SurfaceView witness. No game coordinates are stored.
export type Bounds=readonly [number,number,number,number];
export type Point=readonly [number,number];
const attributes=(tag:string):Record<string,string>=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
export function emulatorViewport(xml:string):Bounds {
 const nodes=[...xml.matchAll(/<node\b[^>]*>/g)].map(m=>attributes(m[0])).filter(a=>a['resource-id']==='com.fastemulator.gbc:id/emulator'&&a['class']==='android.view.SurfaceView');
 if(nodes.length!==1)throw new Error('Unique emulator SurfaceView required');
 const match=/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(nodes[0]?.['bounds']??'');
 if(!match)throw new Error('Invalid SurfaceView bounds');
 const b:Bounds=[Number(match[1]),Number(match[2]),Number(match[3]),Number(match[4])];
 if(b[2]<=b[0]||b[3]<=b[1])throw new Error('Empty SurfaceView');return b;
}
export function myOldBoyLayout(xml:string,viewport:Bounds) {
 if(xml.includes('<!')||!/^\s*(?:<\?xml[^>]*>\s*)?<screen>\s*[\s\S]*<\/screen>\s*$/.test(xml))throw new Error('Unsupported layout XML');
 const width=viewport[2]-viewport[0],height=viewport[3]-viewport[1],regions:Record<string,Bounds>={};
 for(const tag of xml.matchAll(/<control\b[^>]*\/\s*>/g)){
  const a=attributes(tag[0]),type=a['type'],match=/^(\d+),(\d+),(\d+),(\d+)$/.exec(a['bounds']??'');
  if(!type||!match||regions[type])throw new Error('Invalid or duplicate control');
  const b:Bounds=[Number(match[1]),Number(match[2]),Number(match[3]),Number(match[4])];
  if(b[2]<=b[0]||b[3]<=b[1]||b[2]>width||b[3]>height)throw new Error('Control outside current SurfaceView');
  regions[type]=[b[0]+viewport[0],b[1]+viewport[1],b[2]+viewport[0],b[3]+viewport[1]];
 }
 const required=(key:string)=>{const b=regions[key];if(!b)throw new Error(`Missing ${key} control`);return b;};
 const point=(b:Bounds,xf=.5,yf=.5):Point=>[Math.floor(b[0]+(b[2]-b[0])*xf),Math.floor(b[1]+(b[3]-b[1])*yf)];
 const dpad=required('dpad'),start=required('start'),select=regions['select'];
 // In this build "start" is the combined Select/Start widget. Splitting it
 // and choosing cardinal D-pad interiors are visually/live qualified models,
 // not separately named subregions supplied by the XML.
 const controls={A:point(required('a')),B:point(required('b')),
  Up:point(dpad,.5,1/6),Down:point(dpad,.5,5/6),Left:point(dpad,1/6,.5),Right:point(dpad,5/6,.5),
  Start:point(start,select ? .5:.75),Select:point(select??start,select ? .5:.25)};
 return {viewport,regions,controls,menu:point(required('menu')),video:required('video')};
}
export function nativeCrop(bounds:Bounds,physical:Point,native:Point):Bounds {
 const scale=Math.min(native[0]/physical[0],native[1]/physical[1]);
 if(!Number.isFinite(scale)||scale<=0)throw new Error('Invalid frame geometry');
 const x=(native[0]-physical[0]*scale)/2,y=(native[1]-physical[1]*scale)/2;
 return [Math.floor(x+bounds[0]*scale),Math.floor(y+bounds[1]*scale),Math.ceil(x+bounds[2]*scale),Math.ceil(y+bounds[3]*scale)];
}
