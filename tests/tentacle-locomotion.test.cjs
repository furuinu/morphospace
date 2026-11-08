'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function stepPulseTravel(dt){');
const end=html.indexOf('// Dynamic pursuit:',start);
assert.ok(start>0&&end>start,'locomotion implementation must exist');
const code=html.slice(start,end);
function trace(rootY){
 const parts=[{delicate:{type:'strand',root:[0,rootY,0]}}];
 const specimen={seed:100,parts,baseViewDistance:12,viewDistance:12,genome:{style:0,archetype:0,morphDNA:{flat:0,axial:1,branch:0},motionDNA:{}}};
 const travel={specimen:null,position:[0,0,0],velocity:[0,0,0],camera:[0,0,0],phase:0,lastEnvelope:0,breath:0,cycleIndex:null,turnStarted:true,direction:[0,1,0],startDirection:[0,1,0],targetDirection:[0,1,0]};
 const v={norm:a=>{const n=Math.hypot(...a);return n?a.map(x=>x/n):[0,1,0]},dot:(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),scale:(a,b)=>a.map(x=>x*b),add:(a,b)=>a.map((x,i)=>x+b[i]),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
 const ctx={spec:specimen,selected:0,nanoAction:false,nanoRenderPose:false,viewer:{morph:null},pulseTravel:travel,PULSE_TRAVEL_STRENGTH:.175,bodyTime:.2,TAU:Math.PI*2,CYCLE_PERIODS:[1],V:v,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),normalizedMotionDNA:()=>({pulseCycle:0,tempo:1,phase:0,turnConeDegrees:18}),normalizedArchitectureDNA:()=>({grammar:5}),pulseConeDirection:()=>{throw Error('Unexpected turn')},pulseSlerpDirection:(a,b,t)=>a.map((x,i)=>x*(1-t)+b[i]*t),pulsePlaneDirection:()=>[1,0,0],resetPulseTravel(next,preserve){travel.specimen=next;travel.cycleIndex=null;travel.position=[0,0,0];travel.velocity=[0,0,0]},pulseTravelActive:()=>true,seedRng:()=>()=>.5};
 vm.createContext(ctx);vm.runInContext(code,ctx);ctx.stepPulseTravel(.12);
 return {position:travel.position,velocity:travel.velocity,direction:travel.direction};
}

const safetyBegin=html.indexOf('function safeSpecimenAppendages(');
const safetyEnd=html.indexOf('function makeMorphSpecimen(',safetyBegin);
const alignBegin=html.indexOf('function pulseAlignRotation(');
const alignEnd=html.indexOf('function stepPulseTravel(',alignBegin);
assert.ok(safetyBegin>0&&safetyEnd>safetyBegin&&alignEnd>alignBegin);
const safetyCode=html.slice(safetyBegin,safetyEnd);
const safety=new Function(safetyCode+'return safeSpecimenAppendages;')();
const v={norm:a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n)},dot:(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),scale:(a,b)=>a.map(x=>x*b),add:(a,b)=>a.map((x,i)=>x+b[i]),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
const scale3=(x,y,z)=>new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]);
const align=new Function('V','scale3','clamp',html.slice(alignBegin,alignEnd)+'return pulseAlignRotation;')(v,scale3,(x,a,b)=>Math.max(a,Math.min(b,x)));
function sourceGeometry(){
 const copy=(x,mirror)=>({p:[x,0,0],angle:0,axis:'y',scale:1,mirror,mirrorY:false});
 return {copyLayout:5,bound:4,copyTransforms:[copy(-.4,false),copy(.4,true)],
  blobs:[{p:[-.4,0,0],axes:[.6,.7,.6]},{p:[.4,0,0],axes:[.6,.7,.6]}]};
}
function rotatePoint(m,p){return [
 m[0]*p[0]+m[4]*p[1]+m[8]*p[2],
 m[1]*p[0]+m[5]*p[1]+m[9]*p[2],
 m[2]*p[0]+m[6]*p[1]+m[10]*p[2]
];}
test('the swimming heading is determined by the copy grammar, never by unfiltered tentacle roots',()=>{
 const positive=trace(3),negative=trace(-3);
 assert.deepEqual(positive.direction,negative.direction);
 assert.deepEqual(positive.velocity,negative.velocity);
 assert.ok(positive.direction.every(Number.isFinite));
 assert.ok(positive.direction[1]*positive.velocity[1]>0,'movement and heading must agree');
 assert.doesNotMatch(code,/axialTentacleRule|frontHasTentacle|tailSafe|tailAxis/);
});
test('both attachment poles become trailing organs after copied-anatomy safety filtering and final pose alignment',()=>{
 for(const pole of [-3,3]){
  const direction=Math.sign(pole);
  const part={delicate:{type:'strand',root:[0,pole,0],dir:[0,direction,0],length:.8}};
  const em=sourceGeometry(),result=safety(em,[part],100);
  assert.equal(result.parts.length,1,'the strand should be retained when the opposite anterior is chosen');
  assert.ok(result.forward[1]*pole<0,'the protected anterior must be opposite the tentacle roots');
  const swim=trace(pole).direction;
  const m=align(result.forward,swim,1);
  for(const point of [part.delicate.root,[0,pole+direction*.8,0]]){
   const transformed=rotatePoint(m,point);
   assert.ok(v.dot(transformed,swim)<-.02,'the entire strand must trail the final swimming direction');
  }
 }
});
test('the rendered pose aligns the protected anterior after body pose without a discontinuous axis flip',()=>{
 assert.match(html,/frontAxis:safeAppendages\.forward/);
 assert.match(html,/const forward=spec\.frontAxis\?\.length===3\?spec\.frontAxis:/);
 assert.match(html,/const posed=V\.norm\(\[/);
 assert.match(html,/pulseAlignRotation\(posed,pulseTravel\.direction,1,true\)/);
 assert.match(code,/pulseTravel\.velocity\[i\]=dir\[i\]\*speed/);
});
