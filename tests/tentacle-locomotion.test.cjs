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
test('single-pole tentacles trail the actual swimming velocity for either attachment pole',()=>{
 for(const pole of [-3,3]){
  const result=trace(pole);
  assert.ok(result.position[1]*pole<0,'body must move away from tentacle root: '+JSON.stringify(result));
  assert.ok(result.velocity[1]*pole<0,'velocity must match the tail-safe direction: '+JSON.stringify(result));
  assert.ok(result.direction[1]*result.velocity[1]>0,'rendered heading and actual propulsion must agree');
 }
});
test('rendered pose aligns anatomical tail opposition with the same forward heading',()=>{
 assert.match(html,/const waveForward=rootLength>\.25\?rootSum\.map\(v=>-v\/rootLength\)/);
 assert.match(html,/pulseAlignRotation\(waveForward,pulseTravel\.direction,1\)/);
 assert.match(code,/pulseTravel\.velocity\[i\]=dir\[i\]\*speed/);
});
