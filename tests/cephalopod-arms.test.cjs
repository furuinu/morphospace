'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('const strandHash='),b=html.indexOf('// Independent world-space strand particles.',a);
assert.ok(a>0&&b>a,'arm controller missing');
const V={add:(p,q)=>p.map((v,i)=>v+q[i]),sub:(p,q)=>p.map((v,i)=>v-q[i]),scale:(p,s)=>p.map(v=>v*s),dot:(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2],
 cross:(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],norm:p=>{const l=Math.hypot(...p);return l>1e-8?p.map(v=>v/l):[0,1,0]},mix:(p,q,t)=>p.map((v,i)=>v*(1-t)+q[i]*t)};
const api=new Function('V','clamp','TAU',html.slice(a,b)+'return {strandAttention,strandArmPose,strandQuatBetween,strandSmooth};')(V,(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),Math.PI*2);
const arm=(phase=.7,form='arm')=>({rows:25,phase,form,copyIndex:0});
const root=[0,-.5,0],axis=[0,-1,0],centre=[0,0,0];
const pose=(p,t,seed=41)=>api.strandArmPose(p,root,axis,t,api.strandAttention(seed,t,centre,.5,[0,0,6]));
const tipOf=dirs=>dirs.reduce((q,d)=>V.add(q,V.scale(d,.04)),root);

test('an arm posture is a set of unit directions that changes smoothly, also across attention epochs',()=>{
 const p=arm();let previous=pose(p,0);
 for(let t=.01;t<40;t+=.01){
  const now=pose(p,t);
  assert.equal(now.length,24);
  for(let j=0;j<now.length;j++){
   assert.ok(Math.abs(Math.hypot(...now[j])-1)<1e-9);
   assert.ok(Math.hypot(...V.sub(now[j],previous[j]))<.09,'no jump at t='+t.toFixed(2)+' segment '+j);
  }
  previous=now;
 }
});
test('at rest the tip is curled; while reaching the arm unrolls toward what holds its attention',()=>{
 let reached=0,curled=0;
 for(let seed=1;seed<60;seed++){
  const span=7+4*(((Math.sin(seed*127.1+1*311.7+1.7)*43758.5453)%1+1)%1),p=arm(.3+seed*.11);
  const restAttention=api.strandAttention(seed,span*.02,centre,.5,null),reachAttention=api.strandAttention(seed,span*.52,centre,.5,null);
  const rest=api.strandArmPose(p,root,axis,span*.02,restAttention),out=api.strandArmPose(p,root,axis,span*.52,reachAttention);
  const turned=dirs=>Math.acos(Math.max(-1,Math.min(1,V.dot(dirs[0],dirs.at(-1)))));
  if(turned(rest)>.5)curled++;
  const goal=V.norm(V.sub(reachAttention.target,root));
  if(turned(out)<turned(rest)*.6&&V.dot(out.at(-4),goal)>V.dot(rest.at(-4),goal))reached++;
 }
 assert.ok(curled>40,'resting arms keep a curled tip: '+curled);
 assert.ok(reached>=15&&reached<50,'a share of the arms, not all, unrolls toward the target: '+reached);
});
test('the base never swings far from where the arm grows, and attention sometimes goes to the viewer',()=>{
 let viewer=0;
 for(let seed=1;seed<80;seed++)for(let e=0;e<6;e++){
  const span=7+4*(((Math.sin(seed*127.1+1*311.7+1.7)*43758.5453)%1+1)%1),t=(e+.5)*span,at=api.strandAttention(seed,t,centre,.5,[0,0,6]);
  if(at.target[2]===6&&at.target[0]===0)viewer++;
  const dirs=api.strandArmPose(arm(.9),root,axis,t,at);
  assert.ok(V.dot(dirs[0],axis)>.8,'first segment stays close to the growth direction');
 }
 assert.ok(viewer>90&&viewer<250,'about a third of the attention goes to the viewer: '+viewer);
});
test('ring rotation between two directions is a unit quaternion, also for opposite vectors',()=>{
 for(const [p,q] of [[[0,1,0],[0,1,0]],[[0,1,0],[1,0,0]],[[0,1,0],[0,-1,0]],[[1,0,0],[-1,0,0]]]){
  const r=api.strandQuatBetween(p,q);assert.ok(Math.abs(Math.hypot(...r)-1)<1e-9);
 }
});
test('arms are wired into the strand simulation: posture, ring turning and softer threads',()=>{
 assert.match(html,/if\(p\.active\)\{\n   \/\/ Muscle:/);
 assert.match(html,/const dirs=strandArmPose\(p,root,axis,t,strandAttention\(/);
 assert.match(html,/if\(!p\.active\)strandBendRelax\(/);
 assert.match(html,/turn=jointQuatMul\(strandQuatBetween\(V\.norm\(jointQuatApply\(turn,p\.restTangents\[j\]\)\),tangent\),turn\);/);
 assert.match(html,/form:d\.form\|\|'thread',active:!!d\.active/);
 assert.match(html,/worldPoints:null,lastTime:null,copyIndex:index\}/);
});
