import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emulatorViewport,myOldBoyLayout,nativeCrop} from '../experiments/myoldboy-layout.js';
const xml='<screen><control type="video" bounds="0,312,1080,1284" /><control type="dpad" bounds="48,1536,399,1887" /><control type="a" bounds="792,1728,980,1916" /><control type="b" bounds="552,1608,754,1810" /><control type="start" bounds="480,1368,840,1496" /><control type="menu" bounds="120,72,213,165" /></screen>';
const viewport=emulatorViewport('<hierarchy><node resource-id="com.fastemulator.gbc:id/emulator" class="android.view.SurfaceView" bounds="[0,115][1080,2400]" /></hierarchy>');
test('layout coordinates follow SurfaceView origin, updated file bounds and native crop',()=>{
 const p=myOldBoyLayout(xml,viewport);
 assert.deepEqual(p.controls.A,[886,1937]);assert.deepEqual(p.controls.Select,[570,1547]);assert.deepEqual(p.controls.Start,[750,1547]);
 assert.deepEqual(p.controls.Up,[223,1709]);assert.deepEqual(p.video,[0,427,1080,1399]);
 assert.deepEqual(nativeCrop(p.video,[1080,2400],[2400,1080]),[957,192,1443,630]);
 const moved=myOldBoyLayout(xml.replace('792,1728,980,1916','812,1768,1000,1956'),[10,20,1090,2305]);
 assert.deepEqual(moved.controls.A,[916,1882]);assert.deepEqual(moved.menu,[176,138]);
});
test('missing, duplicate or out-of-surface controls and ambiguous viewport refuse geometry',()=>{
 for(const bad of [xml.replace(/<control type="a"[^>]+\/>/,''),xml.replace('</screen>','<control type="a" bounds="1,1,2,2" /></screen>'),xml.replace('792,1728,980,1916','792,1728,1081,1916'),xml.replace('792,1728,980,1916','792,1728,792,1916'),'<!DOCTYPE screen>'+xml])assert.throws(()=>myOldBoyLayout(bad,viewport));
 assert.throws(()=>emulatorViewport('<hierarchy/>'));
 assert.throws(()=>myOldBoyLayout(xml,[0,0,1080,1000]));
});
