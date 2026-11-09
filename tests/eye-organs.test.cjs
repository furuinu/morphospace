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
 assert.ok(bad.count<=4&&bad.type>=0&&bad.support<=3&&bad.size<=.84&&bad.length>=.04&&bad.blinkInterval>=1.3);
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
   assert.ok(part.mesh.data.length/9<2600,'No unbounded tessellation');
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

test('eyelid mesh closes visibly instead of barely flashing',()=>{
 const part=specimen(0,1,1)[0],raw=part.mesh,rig=part.eyeRig;
 const lidVertices=rig.meta.map((m,i)=>({...m,i})).filter(m=>m.node===2&&m.row===1&&Math.abs(m.across)<.00001);
 assert.equal(lidVertices.length,2,'Upper and lower eyelids should both cover the optical center');
 const data=new Float32Array(raw.data.length/9*17);
 for(let i=0;i<raw.data.length/9;i++)data.set(raw.data.subarray(i*9,i*9+9),i*17);
 const mesh={data,buffer:{}},gl={ARRAY_BUFFER:34962,bindBuffer(){},bufferSubData(){}};
 let near=Infinity,far=0;
 const distance=()=>{
  const a=lidVertices[0].i*17,b=lidVertices[1].i*17;
  return Math.hypot(...[0,1,2].map(k=>mesh.data[a+k]-mesh.data[b+k]));
 };
 for(let i=0;i<=200;i++){
  eyes.animateEyeUploaded(gl,mesh,rig,i*rig.interval/200,true);
  const gap=distance();near=Math.min(near,gap);far=Math.max(far,gap);
 }
 assert.ok(far>rig.radius*.80,'The smaller anatomical lid aperture must open clearly');
 assert.ok(near<rig.radius*.23,'Eye must reach a near-closed state');
 assert.ok(far-near>rig.radius*.75,'Blink must have visible travel');
});
test('organic eyestalk has a flared buried root and independent optical pigments',()=>{
 const part=specimen(2,1,1)[0],d=part.eyeRig;
 const stalk=d.meta.filter(m=>m.node===0);
 const radiusAt=u=>{
  const ring=stalk.filter(m=>Math.abs(m.u-u)<.00001);
  return Math.max(...ring.map(m=>Math.hypot(m.p[0],m.p[1])));
 };
 assert.ok(radiusAt(0)>radiusAt(.5)*2,'Root flare must be broader than the stalk');
 assert.ok(radiusAt(1)>radiusAt(.5)*1.3,'Eye cup must broaden again at the tip');
 const opticalIndices=d.meta.map((m,i)=>m.node===1?i:-1).filter(i=>i>=0);
 const skinIndices=d.meta.map((m,i)=>m.node===0?i:-1).filter(i=>i>=0);
 const avg=indices=>[6,7,8].map(c=>indices.reduce((sum,i)=>sum+part.mesh.data[i*9+c],0)/indices.length);
 const oc=avg(opticalIndices),sc=avg(skinIndices),contrast=Math.hypot(...oc.map((q,i)=>q-sc[i]));
 assert.ok(contrast>.16,'Optical pigment must be visibly distinct from skin');
 assert.ok(d.meta.some(m=>m.node===2),'Compound eyes must have a protective blink');
});
test('WebGL renders eye as rigid organ with separate optical material',()=>{
 assert.match(html,/role>12\.0&&role<13\.7/);
 assert.match(html,/bool optical=vRole>12\.9&&vRole<13\.6/);
 assert.match(html,/eyeMesh\.data\[vertex\*17\+12\]=pt\.eyeRig\.meta\[vertex\]\.node===1\?13\.2:12\.4/);
 assert.match(html,/shifted=canonical\+\(attached-anchorCanonical\)/);
 assert.match(html,/const blinkWindow=\.17/);
});

test('one-lens ocellus, compound facet array and camera iris remain morphologically different',()=>{
 const camera=specimen(0,1,1)[0],ocellus=specimen(1,1,1)[0],compound=specimen(2,1,1)[0];
 assert.equal(camera.eyeRig.kind,0);
 assert.equal(ocellus.eyeRig.kind,1);
 assert.equal(compound.eyeRig.kind,2);
 const count=part=>part.eyeRig.meta.filter(x=>x.node===1).length;
 assert.ok(count(compound)>count(camera)*1.25,'Compound eye must consist of conspicuous geometric facets');
 assert.notEqual(count(ocellus),count(camera),'Single lens cap must have its own topology');
});
test('eye sizes cover a broad DNA range and different eyes vary on one body',()=>{
 const sizes=[.09,.20,.38,.79].map(size=>{
  const d=eyes.normalizedEyeDNA({count:2,type:0,support:1,size},1871);
  return eyes.makeEyeOrgans({seed:1871,eyeDNA:d},source,palette)[0].eyeRig.radius;
 });
 assert.ok(sizes[3]/sizes[0]>4,'Eye size should not look fixed across individual DNA');
 const d=eyes.normalizedEyeDNA({count:4,type:1,support:1,size:.48},1871);
 const radii=eyes.makeEyeOrgans({seed:1871,eyeDNA:d},source,palette).map(x=>x.eyeRig.radius);
 assert.ok(Math.max(...radii)/Math.min(...radii)>1.15,'Eyes on one body need individual size variation');
});
test('socket and eyelid do not follow independent gaze rotation',()=>{
 assert.match(html,/else if\(m\.node===2\|\|m\.node===3\|\|m\.node===4\)/);
 assert.match(html,/Lids and socket move with the support/);
 assert.match(html,/fr=radius\*\(\.955\+fraction\*\.14\)/);
 assert.match(html,/function ocularLidProfile\(/);
 assert.match(html,/const sclera=kind===1\?blend\(look\.shadow,look\.coat,\.24\)/);
});

test('an anatomical lower orbital hemisphere encloses the back of the globe',()=>{
 const part=specimen(0,1,1)[0],{meta,radius,cz}=part.eyeRig;
 const cup=meta.filter(m=>m.node===3);
 assert.ok(cup.length>=250,'A dense continuous eye-cup surface replaces the ring');
 assert.ok(cup.some(m=>m.p[1]<-radius*.75),'Inferior tissue must cover the lower hemisphere');
 assert.ok(cup.some(m=>m.p[2]<cz-radius*.85),'Posterior cup must merge into the eye stalk');
 assert.ok(cup.some(m=>m.p[1]>radius*.70),'Upper socket must frame the open eye');
 const frontRim=cup.filter(m=>Math.abs(m.p[2]-cz)<radius*.99);
 assert.ok(frontRim.length>15,'A curved aperture margin must exist');
});
test('eyelids are full moving sheets with rounded margins that stay attached to the cup',()=>{
 const part=specimen(0,1,1)[0],{meta,radius,cz}=part.eyeRig;
 const upper=meta.filter(m=>m.node===2&&m.lidSide===1);
 const lower=meta.filter(m=>m.node===2&&m.lidSide===-1);
 const rounded=meta.filter(m=>m.node===4);
 assert.ok(upper.length>=200&&lower.length>=200,'Both lids must have broad, volumetric surfaces');
 assert.ok(rounded.length>=300,'Moving free edges must have round 3D cross sections');
 assert.ok(lower.some(m=>m.p[1]<-radius*.25),'Lower eyelid must begin below the globe equator');
 const data=new Float32Array(part.mesh.data.length/9*17);
 for(let i=0;i<part.mesh.data.length/9;i++)data.set(part.mesh.data.subarray(i*9,i*9+9),i*17);
 const mesh={data,buffer:{}},gl={ARRAY_BUFFER:34962,bindBuffer(){},bufferSubData(){}};
 const rig=part.eyeRig,base=rig.phase/(2*Math.PI);
 const sample=index=>[0,1,2].map(k=>mesh.data[index*17+k]);
 const middle=meta.map((m,i)=>({m,i})).filter(x=>x.m.node===2&&x.m.row===1&&Math.abs(x.m.across)<.00001);
 assert.equal(middle.length,2,'Top and bottom lid edges must both reach the centre');
 let best=Infinity,upperY=0,lowerY=0;
 for(let i=0;i<=240;i++){
  eyes.animateEyeUploaded(gl,mesh,rig,i*rig.interval/240,true);
  const p=sample(middle[0].i),q=sample(middle[1].i);
  const gap=Math.hypot(...p.map((v,j)=>v-q[j]));
  if(gap<best){best=gap;upperY=p[1];lowerY=q[1];}
 }
 assert.ok(best<radius*.20,'Both thick lids must meet when blinking');
 assert.ok(Number.isFinite(upperY)&&Number.isFinite(lowerY));
});
