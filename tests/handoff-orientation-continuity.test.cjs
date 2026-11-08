'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function pulseAlignRotation('),end=html.indexOf('function stepPulseTravel(',start);
assert.ok(start>0&&end>start,'orientation correction source missing');
const source=html.slice(start,end);
function harness(){
 const clock={now:1000};
 const prelude=`
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const V={
  norm:p=>{const n=Math.hypot(...p)||1;return p.map(v=>v/n)},
  dot:(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 };
 const scale3=(x,y,z)=>new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]);
 let spec={id:1};const pulseTravel={};
 const performance={now:()=>clock.now};
 `;
 const factory=new Function('clock',prelude+source+
 'return {align:pulseAlignRotation,state:pulseTravel,setSpec:s=>{spec=s}};');
 return {...factory(clock),tick:ms=>clock.now+=ms};
}
function maxDifference(a,b){return Math.max(...Array.from(a,(v,i)=>Math.abs(v-b[i])))}
test('B orientation remains continuous when body axes cross the 180 degree singularity',()=>{
 const f=harness();
 const a=f.align([0,1,0],[0,-1,0],1,true);
 f.tick(16);
 const b=f.align([.0002,1,0],[0,-1,.0002],1,true);
 assert.ok([...a,...b].every(Number.isFinite));
 assert.ok(maxDifference(a,b)<.05,'a near-antiparallel alignment flipped the roll axis');
});
test('large changes in desired alignment are eased over consecutive frames',()=>{
 const f=harness(),a=f.align([0,1,0],[0,1,0],1,true);
 f.tick(16);
 const b=f.align([0,1,0],[0,-1,0],1,true);
 assert.ok(maxDifference(a,b)<.25,'single frame made a sudden 180 degree turn');
 for(let i=0;i<80;i++){f.tick(16);f.align([0,1,0],[0,-1,0],1,true);}
 assert.ok(Math.abs(f.state.alignmentQuat[3])<.20,'the correction never converged on the new direction');
});
test('specimen changes reset the stored quaternion without retaining A orientation',()=>{
 const f=harness();f.align([0,1,0],[1,0,0],1,true);
 const prior=f.state.alignmentQuat.slice();
 f.setSpec({id:2});f.tick(16);
 f.align([0,1,0],[0,1,0],1,true);
 assert.ok(f.state.alignmentQuat[3]>.999);
 assert.notDeepEqual(f.state.alignmentQuat,prior);
});
test('orbit heading changes only after B finishes the camera handoff',()=>{
 assert.doesNotMatch(html,/if\(!m\.headingChanged&&p>\.80\)/);
 assert.doesNotMatch(html,/if\(!m\.headingChanged&&p>=\.80\)/);
 assert.match(html,/if\(!m\.headingChanged&&p>=1\)\{m\.headingChanged=true;cameraOrbitChooseHeading\(\);\}/);
 assert.match(html,/m\.warpPosition=m\.warpTarget\.slice\(\);cancelViewerMorph\(true\);\s*if\(!m\.headingChanged\)/);
 assert.match(html,/pulseAlignRotation\(posed,pulseTravel\.direction,1,true\)/);
});
