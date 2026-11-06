const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('const cameraCorrection=');
const end=html.indexOf('function pulseCameraDistance()',begin);
assert.ok(begin>=0&&end>begin,'camera-follow implementation should exist');
const followSource=html.slice(begin,end);

function setup({drift=0,pan=true}={}){
 const specimen={viewDistance:20};
 const morph=pan?{mode:'camera-pan',switched:true,travelDistance:10,cameraTravel:10,travelAxis:[1,0,0]}:null;
 const pulseTravel={specimen,position:[drift,0,0],velocity:[0,0,0],camera:[0,0,0]};
 const context={
  Math,spec:specimen,viewer:{morph},pulseTravel,canvas:{width:1120,height:720},
  pulseTravelActive:()=>true,cameraOrbitAngularSpeed:()=>.08,
  worldCameraFrame:()=>({position:[0,0,20],right:[1,0,0],up:[0,1,0],back:[0,0,1]}),
  cameraViewEnvelope:()=>({halfWidth:10,halfHeight:8}),
  V:{dot:(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0)}
 };
 vm.createContext(context);
 vm.runInContext(followSource,context);
 return {context,pulseTravel,advance:()=>vm.runInContext('stepPulseCameraFollow(.1)',context)};
}
test('camera-pan tracks only projected drift, never chases the intended incoming travel twice',()=>{
 const {pulseTravel,advance}=setup();
 for(let i=0;i<40;i++)advance();
 assert.equal(pulseTravel.camera[0],0,'following the planned approach would overshoot B');
});
test('camera-pan corrects a genuinely displaced incoming specimen smoothly',()=>{
 const {pulseTravel,advance}=setup({drift:3});
 advance();
 assert.ok(pulseTravel.camera[0]>0,'follow must steer toward the displaced specimen');
 assert.ok(pulseTravel.camera[0]<.3,'first frame must not snap to centre');
 for(let i=0;i<50;i++)advance();
 assert.ok(pulseTravel.camera[0]>1&&pulseTravel.camera[0]<3,'drift correction should settle without overshooting');
});
test('the native swap retains camera correction and resets B locomotion position',()=>{
 assert.match(html,/pulseTravelActive\(\)&&\(pulseTravel\.specimen===spec\|\|!!m\)/);
 assert.match(html,/if\(pulseTravel\.specimen!==spec\)\{resetPulseTravel\(spec,true\);pulseTravel\.position\.fill\(0\);\}/);
});
