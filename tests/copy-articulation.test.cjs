'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const ctx=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],ctx);
vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=fn=>vm.runInContext('('+fn.toString()+')()',ctx,{timeout:120000});
test('symmetrical copies share a hinge clock and move in mirrored +/-20-degree arcs',()=>{
 const data=run(function(){
  const d=normalizedMotionDNA(null,841237,0);
  d.hingeAmplitude=20*Math.PI/180;d.hingeSecondary=.2;d.hingeCycle=4;d.hingeMode=0;d.hingeLag=.2;
  const poses=Array.from({length:20},(_,i)=>[copyArticulationPose(i*.33,d,0,2,1),copyArticulationPose(i*.33,d,1,2,1)]);
  return {pairs:poses.map(([a,b])=>[a.flap+b.flap,a.feather+b.feather]),
   max:Math.max(...poses.flat().map(p=>Math.abs(p.flap))),
   moved:poses.some(([a])=>Math.abs(a.flap)>.15)};
 });
 assert.equal(data.moved,true);
 for(const p of data.pairs)assert.ok(Math.abs(p[0])<1e-10&&Math.abs(p[1])<1e-10);
 assert.ok(data.max<=20*Math.PI/180+1e-10);
});
test('secondary hinges have genetic inheritance and archived DNA migrates consistently',()=>{
 const d=run(function(){
  const a=makeFounderGenome(1003207,0,2),b=makeFounderGenome(1003208,4,3);
  const old={...a.motionDNA};
  for(const key of ['hingeMode','hingeCycle','hingeAmplitude','hingeSecondary','hingeLag','hingePhase'])delete old[key];
  const x=normalizedMotionDNA(old,a.seed,2,a.morphDNA),y=normalizedMotionDNA(old,a.seed,2,a.morphDNA);
  const child=crossoverGenome(a,b,540913,2,.75).genome.motionDNA;
  const keys=['hingeAmplitude','hingeSecondary','hingeLag','hingePhase'];
  return {same:JSON.stringify(x)===JSON.stringify(y),mode:child.hingeMode,cycle:child.hingeCycle,
   finite:keys.every(k=>Number.isFinite(child[k])),version:child.version};
 });
 assert.equal(d.same,true);assert.ok(d.mode>=0&&d.mode<4);assert.ok(d.cycle>=0&&d.cycle<9);
 assert.equal(d.finite,true);assert.equal(d.version,7);
});
test('all growth grammars retain bounded rigid copy matrices and preserve reflection handedness',()=>{
 const d=run(function(){
  const observations=[];
  const determinant=m=>m[0]*(m[5]*m[10]-m[6]*m[9])-m[4]*(m[1]*m[10]-m[2]*m[9])+m[8]*(m[1]*m[6]-m[2]*m[5]);
  for(let layout=1;layout<=5;layout++){
   const g=makeFounderGenome(191230+layout*67,layout%8,layout%8);
   g.architectureDNA.grammar=layout;
   const t=architectureGrowth(g).copyTransforms;
   for(let i=0;i<t.length;i++){
    const p=copyArticulationPose(3.17,g.motionDNA,i,t.length,layout,1);
    const rest=articulatedCopyMatrix(t[i],null,layout),active=articulatedCopyMatrix(t[i],p,layout);
    observations.push({layout,finite:Array.from(active).every(Number.isFinite),
     restSign:Math.sign(determinant(rest)),activeSign:Math.sign(determinant(active)),
     detDelta:Math.abs(Math.abs(determinant(rest))-Math.abs(determinant(active))),
     different:Array.from(active).some((n,j)=>Math.abs(n-rest[j])>1e-6),
     max:Math.abs(p.flap)});
   }
  }
  return observations;
 });
 assert.equal(new Set(d.map(x=>x.layout)).size,5);
 assert.ok(d.every(x=>x.finite&&x.restSign===x.activeSign&&x.detDelta<1e-5));
 assert.ok(d.some(x=>x.different));assert.ok(d.every(x=>x.max<=.43+1e-8));
});
test('turning organism movement off removes structural articulation without affecting per-vertex shaders',()=>{
 assert.match(html,/const pose=enabled\?copyArticulationPose/);
 assert.match(html,/articulatedCopyMatrix\(t,pose,spec\.growthModel\.copyLayout\)/);
 assert.match(html,/setCopyMotionUniforms\(gl,u,null\)/,'local meshes must use only CPU copy placement; no GPU copy-space remapping');
 assert.match(html,/vec3 peristalsis=surfaceMotion\(canonical,canonicalNormal,ancestralTime/);
});
