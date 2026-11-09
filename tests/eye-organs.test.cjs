'use strict';
// MORPHOSPACE ocular DNA, surface anchoring and GPU-buffer kinematics regression.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const EYE_TYPES='),end=html.indexOf('function makeMorphSpecimen(',start);
assert.ok(start>0&&end>start,'The ocular anatomy must be in the worker-safe core script');
const TAU=Math.PI*2;
function seedRng(seed){let s=(seed|0)>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const V={
 add:(a,b)=>a.map((v,i)=>v+b[i]),
 sub:(a,b)=>a.map((v,i)=>v-b[i]),
 scale:(a,t)=>a.map(v=>v*t),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);},
};
function buildMesh(positions,colors,faces){
 const normals=Array.from({length:positions.length},()=>[0,0,0]),tri=[];
 for(const [a,b,c]of faces){
  const d=V.cross(V.sub(positions[b],positions[a]),V.sub(positions[c],positions[a]));
  if(Math.hypot(...d)<1e-9)continue;
  for(const v of [a,b,c])normals[v]=V.add(normals[v],d);
  tri.push(a,b,c);
 }
 const data=new Float32Array(positions.length*9);
 for(let i=0;i<positions.length;i++)
  data.set([...positions[i],...V.norm(normals[i]),...colors[i]],i*9);
 return{data,tri:new Uint16Array(tri),edges:new Uint16Array(0)};
}
const context={TAU,seedRng,clamp,V,Math,Float32Array,Uint16Array,
 buildMesh,
 colorFor:(pal,u,a,k)=>[.24+.12*Math.sin(u+1),.42+.12*Math.cos(a),.60+.10*Math.sin(k)],
 anchorOnGrowthSurface:(src,pos,dir,r)=>V.add(pos,V.scale(dir,r*.82))
};
vm.createContext(context);
vm.runInContext(html.slice(start,end)+'\nthis.eyes={eyeFounderDNA,normalizedEyeDNA,eyeCrossoverDNA,makeEyeOrgans,animateEyeUploaded};',context,{timeout:2000});
const eyes=context.eyes;
const source={blobs:[{p:[0,0,0],axes:[.95,1.3,.85]},{p:[.3,.7,.1],axes:[.5,.65,.45]}]};
const palette={};
function specimen(type,support,count=2){
 const dna=eyes.normalizedEyeDNA({count,type,support,size:.32,length:.7,blinkInterval:4,independence:.72},1871);
 return eyes.makeEyeOrgans({seed:1871,eyeDNA:dna},source,palette);
}
test('ocular founder and legacy normalization are deterministic and bounded',()=>{
 const a=eyes.eyeFounderDNA(891),b=eyes.eyeFounderDNA(891);
 assert.equal(JSON.stringify(a),JSON.stringify(b));
 assert.equal(JSON.stringify(eyes.normalizedEyeDNA(null,891)),JSON.stringify(a));
 const bad=eyes.normalizedEyeDNA({count:90,type:-2,support:100,size:900,length:-1,blinkInterval:0},891);
 assert.ok(bad.count<=4&&bad.type>=0&&bad.support<=3&&bad.size<=.51&&bad.length>=.04&&bad.blinkInterval>=1.3);
});
test('an eye-free genotype does not fabricate organs',()=>{
 const d=eyes.normalizedEyeDNA({count:0},7);
 assert.equal(eyes.makeEyeOrgans({seed:7,eyeDNA:d},source,palette).length,0);
});
test('every ocular type and support produces finite, bounded, manifold-like triangle batches',()=>{
 for(let type=0;type<5;type++)for(let support=0;support<4;support++){
  const out=specimen(type,support);
  assert.equal(out.length,2,JSON.stringify({type,support}));
  for(const part of out){
   assert.ok(part.eyeRig&&part.mesh.data.length>50&&part.mesh.tri.length>30);
   assert.equal(part.mesh.data.length/9,part.eyeRig.meta.length);
   assert.ok(part.mesh.data.length/9<1500,'No unbounded tessellation');
   assert.ok(Array.from(part.mesh.data).every(Number.isFinite),'No broken vertices/normals');
   const max=Math.max(...part.mesh.tri);
   assert.ok(max<part.eyeRig.meta.length,'Triangle indices within the eye mesh');
  }
 }
});
test('eye support and gaze animation affect vertices and reset cleanly',()=>{
 const part=specimen(0,2,1)[0],raw=part.mesh;
 const data=new Float32Array(raw.data.length/9*17);
 for(let i=0;i<raw.data.length/9;i++)data.set(raw.data.subarray(i*9,i*9+9),i*17);
 const fake={data,buffer:{id:'eye'}};
 const records=[];const gl={ARRAY_BUFFER:34962,bindBuffer:(target,buffer)=>records.push(['bind',target]),bufferSubData:(target,offset,values)=>records.push(['write',values.length])};
 const rest=fake.data.slice();
 eyes.animateEyeUploaded(gl,fake,part.eyeRig,3.7,true);
 assert.ok(fake.data.some((v,i)=>i%17<3&&Math.abs(v-rest[i])>1e-6),'Eye did not move');
 assert.ok(Array.from(fake.data).every(Number.isFinite),'Eye update created nonfinite coordinates');
 const writes=records.filter(r=>r[0]==='write').length;
 eyes.animateEyeUploaded(gl,fake,part.eyeRig,3.7,true);
 assert.equal(records.filter(r=>r[0]==='write').length,writes,'Identical frame redundantly uploaded');
 eyes.animateEyeUploaded(gl,fake,part.eyeRig,0,false);
 assert.ok(fake.data.every((v,i)=>v===rest[i]),'Motion-off must restore the original eye');
});
test('eye DNA recombination records parental contribution and limits mutation',()=>{
 const a=eyes.eyeFounderDNA(14),b=eyes.eyeFounderDNA(22),log=[],inherited={};
 const child=eyes.eyeCrossoverDNA(a,b,874,.7,log,inherited);
 assert.ok(child.count>=0&&child.count<=4&&child.support>=0&&child.support<4);
 assert.ok(['A','B'].includes(inherited.eye_anatomy));
 assert.ok(['A','B'].includes(inherited.eye_movement));
 assert.ok(log.every(x=>x.field.startsWith('eyeDNA.')));
});
