'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf(' function validatePayload(p){');
const end=html.indexOf(' function encode(payload)',begin);
assert.ok(begin>=0&&end>begin,'CaptureShare payload validator must exist');
const validator=html.slice(begin,end);
const context=vm.createContext({});
vm.runInContext("const VERSION=1, PALETTE_ROW_LIMIT=252;const forbidden=k=>['__proto__','constructor','prototype'].includes(k);"+validator+';globalThis.check=validatePayload;',context);
const check=context.check;
const duplicate=value=>JSON.parse(JSON.stringify(value));
const morph=Object.fromEntries(['axial','flat','radial','branch','fusion','void','lobation','asymmetry','twist','budding','extension','lamella','surface','polarity','strain','shear'].map(k=>[k,.5]));
const payload={version:1,record:{id:'photo-regression',name:'写真由来個体',seed:123456,genome:{
 seed:123456,style:2,morphDNA:morph,photoDNA:{version:1,source:'camera',seed:4294967295,points:[[0,0,.7,.8],[-.8,.3,.5,.6],[.5,-.7,.4,.3]]}
},generation:0,parents:[]}};
test('photo DNA and legacy specimens pass the same save/share validation',()=>{
 assert.doesNotThrow(()=>check(duplicate(payload)));
 const legacy=duplicate(payload);delete legacy.record.genome.photoDNA;
 assert.doesNotThrow(()=>check(legacy));
});
test('malformed photo landmarks, oversized seeds, and unexpected fields are rejected',()=>{
 const changes=[
  x=>x.record.genome.photoDNA.source='not-camera',
  x=>x.record.genome.photoDNA.seed=4294967296,
  x=>x.record.genome.photoDNA.points[0][2]=5,
  x=>x.record.genome.photoDNA.points=[[0,0,.5,.5]],
  x=>x.record.genome.photoDNA.points.push(...Array.from({length:20},()=>[0,0,.5,.5])),
  x=>x.record.genome.photoDNA.unexpected='injection'
 ];
 for(const change of changes){const malformed=duplicate(payload);change(malformed);assert.throws(()=>check(malformed));}
});
