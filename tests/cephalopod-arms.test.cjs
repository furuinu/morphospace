'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const cut=(from,to)=>{const a=html.indexOf(from),b=html.indexOf(to,a);assert.ok(a>0&&b>a,'missing: '+from);return html.slice(a,b);};
const V={add:(p,q)=>p.map((v,i)=>v+q[i]),sub:(p,q)=>p.map((v,i)=>v-q[i]),scale:(p,s)=>p.map(v=>v*s),dot:(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2],
 cross:(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],norm:p=>{const l=Math.hypot(...p);return l>1e-8?p.map(v=>v/l):[0,1,0]},mix:(p,q,t)=>p.map((v,i)=>v*(1-t)+q[i]*t)};
const source=cut('function seedRng(','\n')+'\n'+cut('const CYCLE_PERIODS=','\n')+'\n'+cut('// How the tentacles move is inherited','const MOTION_FIELDS=[')+cut('const strandHash=','// Independent world-space strand particles.');
const api=new Function('V','clamp','TAU',source+'return {strandAttention,strandArmPose,tentaclePose,tentacleGenes,tentacleTiming,tentacleStyleMix,tentacleBodyCycles,tentacleFounderGenes,strandQuatBetween,TENTACLE_STYLES,TENTACLE_SYNCS};')(V,(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),Math.PI*2);
const centre=[0,0,0];
// A crown of tentacles hanging under the body: roots on a ring, growing down and a little outward.
function strand({style=0,sync=0,alt=style,order=0,count=8,seed=41,form='arm',copyIndex=0}={}){
 const a=Math.PI*2*order/count,root=[.5*Math.cos(a),-.3,.5*Math.sin(a)],axis=V.norm([.25*Math.cos(a),-1,.25*Math.sin(a)]);
 return {p:{rows:25,phase:.7+order*.37,form,copyIndex,order,orderCount:count,genome:{seed,motionDNA:{tentacleStyle:style,tentacleSync:sync,tentacleAlt:alt,tempo:1,amplitude:1,pulseCycle:6,phase:0}}},root,axis};
}
const env=(seed,t)=>({centre,attention:api.strandAttention(seed%9973,t,centre,.5,[0,0,6])});
const pose=(s,t)=>api.strandArmPose(s.p,s.root,s.axis,t,env(s.p.genome.seed,t));
const single=(s,t,style)=>api.tentaclePose(s.p,s.root,s.axis,t,env(s.p.genome.seed,t),style);
const inwardLean=(s,dirs)=>{const inward=V.norm([-s.root[0],0,-s.root[2]]);return dirs.reduce((sum,d)=>sum+V.dot(d,inward),0)/dirs.length;};

test('six styles and five ways of keeping time, named in the code',()=>{
 assert.deepEqual(Array.from(api.TENTACLE_STYLES),['pulse','undulate','explore','coil','sweep','drift']);
 assert.deepEqual(Array.from(api.TENTACLE_SYNCS),['unison','wave','alternate','scattered','groups']);
});
test('every style and timing gives unit directions that change smoothly, also while the animal changes style',()=>{
 for(let style=0;style<6;style++)for(let sync=0;sync<5;sync++){
  const s=strand({style,sync,alt:(style+2)%6,order:3});let previous=pose(s,0);
  for(let t=.01;t<70;t+=.01){
   const now=pose(s,t);assert.equal(now.length,24);
   for(let j=0;j<24;j++){
    assert.ok(Math.abs(Math.hypot(...now[j])-1)<1e-9);
    assert.ok(Math.hypot(...V.sub(now[j],previous[j]))<.15,api.TENTACLE_STYLES[style]+'/'+api.TENTACLE_SYNCS[sync]+' jumps at t='+t.toFixed(2)+' segment '+j);
   }
   previous=now;
  }
 }
});
test('pulse: the crown closes and opens with the body stroke, the tip a little after the root',()=>{
 const s=strand({style:0}),period=2; // pulseCycle 6 is 2 s at tempo 1
 assert.ok(Math.abs(api.tentacleBodyCycles(s.p,period)-api.tentacleBodyCycles(s.p,0)-1)<1e-9,'one tentacle cycle per body stroke');
 const open=inwardLean(s,single(s,0,0)),closed=inwardLean(s,single(s,period*.4,0));
 assert.ok(closed-open>.35,'closing leans the whole tentacle inward: '+open.toFixed(2)+' -> '+closed.toFixed(2));
 assert.ok(open<0,'open means flared outward');
 const again=single(s,period*.4+period*3,0),first=single(s,period*.4,0);
 assert.ok(V.dot(again[0],first[0])>.995,'the stroke repeats with the body');
 // The bend starts at the root and travels outward: each segment runs a little behind the one before.
 const early=single(s,period*.10,0),start=single(s,0,0);
 assert.ok(Math.acos(Math.min(1,V.dot(early[1],start[1])))>.02,'early in the stroke the root has already turned in');
 assert.match(html,/c=strandFrac\(cycles-\.16\*u\),stroke=strandSmooth\(\.02,\.26,c\)-strandSmooth\(\.55,\.98,c\)/);
 // A very fast body stroke is followed every few beats, never at a frantic pace.
 const fast=strand({style:0});fast.p.genome.motionDNA.pulseCycle=0;
 const seconds=1/(api.tentacleBodyCycles(fast.p,1)-api.tentacleBodyCycles(fast.p,0));
 assert.ok(seconds>=1.6-1e-9&&Math.abs(seconds/(1/6)-Math.round(seconds/(1/6)))<1e-9,'a whole number of body strokes, at least 1.6 s: '+seconds);
});
test('timing: unison moves together, a wave goes round the ring, alternate is half a beat apart, scattered each on its own',()=>{
 const t=.5,lean=(sync,order)=>{const s=strand({style:0,sync,order});return inwardLean(s,single(s,t,0));};
 const spread=sync=>{const all=[...Array(8)].map((_,o)=>lean(sync,o));return Math.max(...all)-Math.min(...all);};
 for(let order=0;order<8;order++)assert.deepEqual(api.tentacleTiming(strand({sync:0,order}).p,0),{shift:0,rate:1},'unison: one beat for all');
 assert.ok(spread(1)>.3&&spread(0)<spread(1)*.4,'a wave spreads the stroke round the ring, unison does not: '+spread(0).toFixed(2)+' / '+spread(1).toFixed(2));
 assert.deepEqual(api.tentacleTiming(strand({sync:1,order:2}).p,1),{shift:.25,rate:1});
 assert.equal(api.tentacleTiming(strand({sync:2,order:3}).p,2).shift,.5);assert.equal(api.tentacleTiming(strand({sync:2,order:4}).p,2).shift,0);
 assert.equal(api.tentacleTiming(strand({sync:2,order:3,copyIndex:1}).p,2).shift,0,'the mirrored copy alternates against its twin');
 const rates=new Set([...Array(8)].map((_,o)=>api.tentacleTiming(strand({sync:3,order:o}).p,3).rate.toFixed(3)));assert.ok(rates.size>=7,'scattered: each its own pace');
 const groups=[...Array(9)].map((_,o)=>api.tentacleTiming(strand({sync:4,order:o,count:9}).p,4).shift);
 assert.ok(groups[0]===groups[1]&&groups[1]===groups[2]&&groups[3]===groups[5]&&groups[2]!==groups[3],'groups of three share a beat');
});
test('undulate bends far more than drift; coil winds the tip up and lets go; sweep leans everything one way',()=>{
 // How fast the middle of the arm swings, on average (radians per second).
 const liveliness=style=>{let total=0;const s=strand({style});let before=single(s,0,style)[12];for(let t=.1;t<30;t+=.1){const now=single(s,t,style)[12];total+=Math.acos(Math.min(1,V.dot(now,before)));before=now;}return total/30;};
 assert.ok(liveliness(1)>liveliness(5)*2.5,'undulate: '+liveliness(1).toFixed(2)+' vs drift '+liveliness(5).toFixed(2));
 const s=strand({style:3}),wound=t=>{const d=single(s,t,3);let a=0;for(let j=1;j<24;j++)a+=Math.acos(Math.min(1,V.dot(d[j],d[j-1])));return a;};
 const winds=[...Array(80)].map((_,i)=>wound(i*.25));assert.ok(Math.max(...winds)>Math.PI*1.5&&Math.min(...winds)<Math.PI*.9,'coil winds past 270 degrees and relaxes: '+Math.max(...winds).toFixed(2)+' / '+Math.min(...winds).toFixed(2));
 const t=3,mean=[0,0,0];for(let order=0;order<8;order++){const q=strand({style:4,order}),d=single(q,t,4);for(const v of d.slice(12))for(let k=0;k<3;k++)mean[k]+=v[k]-q.axis[k];}
 assert.ok(Math.hypot(mean[0],mean[2])/(8*12)>.12,'sweep: a common sideways lean');
});
test('explore: a share of the arms unrolls toward what holds the attention; in unison they all go',()=>{
 let reached=0,all=0;
 for(let seed=1;seed<60;seed++){
  const span=7+4*(((Math.sin((seed%9973)*127.1+1*311.7+1.7)*43758.5453)%1+1)%1);
  const count=sync=>{let n=0;for(let order=0;order<8;order++){const s=strand({style:2,sync,order,seed}),e=env(seed,span*.52);
   if(!e.attention.awake)return -1;
   const rest=api.tentaclePose(s.p,s.root,s.axis,span*.02,env(seed,span*.02),2),out=api.tentaclePose(s.p,s.root,s.axis,span*.52,e,2);
   const outerBend=d=>Math.acos(Math.max(-1,Math.min(1,V.dot(d[12],d.at(-1)))));if(outerBend(out)<.4&&outerBend(rest)>outerBend(out)+.15)n++;}return n;};
  const scattered=count(3),unison=count(0);if(scattered<0)continue;
  if(scattered>0&&scattered<8)reached++;if(unison>=7)all++;
 }
 assert.ok(reached>20,'scattered: some arms, not all: '+reached);assert.ok(all>30,'unison: the whole crown reaches: '+all);
});
test('the animal changes into its second style now and then, and drift takes almost no effort',()=>{
 const genes=api.tentacleGenes(strand({style:1,alt:3}).p);let main=0,alt=0,between=0;
 for(let t=0;t<4000;t+=.5){const m=api.tentacleStyleMix(genes,t);if(m>.999)main++;else if(m<.001)alt++;else between++;}
 assert.ok(alt/(main+alt)>.2&&alt/(main+alt)<.45,'about a third of the time in the second style: '+(alt/(main+alt)).toFixed(2));
 assert.ok(between>0&&between<(main+alt)*.2,'changes are brief crossfades');
 assert.equal(api.tentacleStyleMix(api.tentacleGenes(strand({style:2,alt:2}).p),123),1,'one style only: no change');
 assert.equal(pose(strand({style:5,alt:5}),3).effort,.3);assert.equal(pose(strand({style:1,alt:1}),3).effort,1);
});
test('tentacle habits are genes: founders are deterministic and in range, bad values fall back, both parents pass them on',()=>{
 const seen={style:new Set(),sync:new Set(),alt:new Set()};
 for(let seed=1;seed<400;seed++){
  const f=api.tentacleFounderGenes(seed);assert.deepEqual(f,api.tentacleFounderGenes(seed));
  assert.ok(Number.isInteger(f.tentacleStyle)&&f.tentacleStyle>=0&&f.tentacleStyle<6&&f.tentacleSync>=0&&f.tentacleSync<5&&f.tentacleAlt>=0&&f.tentacleAlt<6);
  seen.style.add(f.tentacleStyle);seen.sync.add(f.tentacleSync);seen.alt.add(f.tentacleAlt);
  const g=api.tentacleGenes({genome:{seed,motionDNA:{tentacleStyle:9,tentacleSync:-1,tentacleAlt:2.5}}});
  assert.deepEqual([g.style,g.sync,g.alt],[f.tentacleStyle,f.tentacleSync,f.tentacleAlt],'invalid genes fall back to the founder');
 }
 assert.equal(seen.style.size,6);assert.equal(seen.sync.size,5);assert.equal(seen.alt.size,6);
 assert.match(html,/Object\.assign\(d,tentacleFounderGenes\(seed\)\);/);
 assert.match(html,/for\(const key in TENTACLE_GENES\)if\(Number\.isInteger\(source\[key\]\)&&source\[key\]>=0&&source\[key\]<TENTACLE_GENES\[key\]\)d\[key\]=source\[key\];/);
 assert.match(html,/for\(const key in TENTACLE_GENES\)\{\n  d\[key\]=\(r\(\)<\.5\?A:B\)\[key\];\n  if\(r\(\)<\.08\+\.24\*mutationStrength\)/);
});
test('ring rotation between two directions is a unit quaternion, also for opposite vectors',()=>{
 for(const [p,q] of [[[0,1,0],[0,1,0]],[[0,1,0],[1,0,0]],[[0,1,0],[0,-1,0]],[[1,0,0],[-1,0,0]]]){
  const r=api.strandQuatBetween(p,q);assert.ok(Math.abs(Math.hypot(...r)-1)<1e-9);
 }
});
test('wired into the strand simulation: arms firmly, threads faintly over their inner half, thick parts turn their rings',()=>{
 assert.match(html,/thick:!!d\.active\|\|d\.form==='cerata',muscle:d\.active\?1:d\.form==='cerata'\?\.6:\.24,/);
 assert.match(html,/const dirs=strandArmPose\(p,root,axis,t,env\);effort=dirs\.effort\*p\.muscle;/);
 assert.match(html,/rate=p\.active\?\(9\.5-6\.0\*u\)\*dirs\.effort:9\.5\*effort\*Math\.max\(0,1-u\/\.55\);/);
 assert.match(html,/if\(!p\.active\)strandBendRelax\(/);
 assert.match(html,/ if\(p\.thick\)\{\n  \/\/ A thick arm cannot just slide its rings along:/);
 assert.match(html,/turn=jointQuatMul\(strandQuatBetween\(V\.norm\(jointQuatApply\(turn,p\.restTangents\[j\]\)\),tangent\),turn\);/);
 assert.match(html,/worldPoints:null,lastTime:null,copyIndex:index\}/);
});
