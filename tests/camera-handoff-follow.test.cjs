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
 const morph=pan?{mode:'camera-pan',switched:true,travelDistance:10,cameraTravel:10,fromDistance:20,toDistance:20,travelAxis:[1,0,0]}:null;
 const pulseTravel={specimen,position:[drift,0,0],velocity:[0,0,0],camera:[0,0,0]};
 const context={
  Math,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),cameraHandoffEase:x=>x*x*(3-2*x),
  spec:specimen,viewer:{morph},pulseTravel,canvas:{width:1120,height:720},
  modelYaw:0,modelPitch:0,cameraRoll:0,panX:0,panY:0,
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
test('offscreen B is guided laterally before the visible swap without slowing primary pan',()=>{
 const {context,pulseTravel,advance}=setup();
 const m=context.viewer.morph;
 m.switched=false;m.entryPlanar=[1,0];m.elapsed=3;m.duration=5;
 // An orbit changes the projected screen heading: B drifts above the entry line.
 context.worldCameraFrame=()=>({position:[0,2,20],right:[1,0,0],up:[0,1,0],back:[0,0,1]});
 advance();
 assert.ok(pulseTravel.camera[1]<0,'camera must correct the live transverse entry error before B appears');
 assert.equal(pulseTravel.camera[0],0,'primary lateral pan speed and distance must be untouched');
});
test('visible incoming B eases toward its actual screen centre, not the old planned endpoint',()=>{
 const {context,pulseTravel,advance}=setup();
 const m=context.viewer.morph;
 m.cameraTravel=12;m.elapsed=3;m.duration=5;
 advance();
 assert.equal(pulseTravel.camera[0],0,'first visible frame must begin without a corrective snap');
 m.elapsed+=1.5;
 advance();
 assert.ok(pulseTravel.camera[0]>0,'once visible, camera must ease toward B actual screen position');
 assert.ok(pulseTravel.camera[0]<.3,'correction must remain speed bounded');
});
test('star death eligibility is limited to the inner 70 percent of the viewport',()=>{
 const section=html.slice(html.indexOf('function tickStarNursery('),html.indexOf('function playSnowChime('));
 assert.match(section,/Math\.abs\(x\)<=inner\.halfWidth\*\.70/);
 assert.match(section,/Math\.abs\(y\)<=inner\.halfHeight\*\.70/);
 assert.match(section,/if\(z<=0\)return false/);
});
test('the native swap retains camera correction and resets B locomotion position',()=>{
 assert.match(html,/pulseTravelActive\(\)&&\(pulseTravel\.specimen===spec\|\|!!m\)/);
 assert.match(html,/if\(pulseTravel\.specimen!==spec\)\{resetPulseTravel\(spec,true\);pulseTravel\.position\.fill\(0\);\}/);
});
