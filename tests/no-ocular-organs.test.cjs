'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const archive=fs.readFileSync(path.join(root,'docs','OCULAR-EXPERIMENT-ARCHIVE.md'),'utf8');

test('no ocular geometry, DNA generator or specialised cornea shaders remain in production',()=>{
 for(const symbol of ['eyeFounderDNA','normalizedEyeDNA','eyeCrossoverDNA',
  'makeEyeOrgans','planFinishedEyes','animateEyeUploaded',
  'ocularLidProfile','ocularMembraneProfile','hexCorneaGLSL',
  'hexCorneaSample','eyeRig','EYE_TYPES','compoundShape','lidStyle']){
  assert.equal(html.includes(symbol),false,symbol+' must be retired from source');
 }
 assert.doesNotMatch(html,/role:\s*['"]eye['"]|kind:\s*['"]eye['"]/);
 assert.doesNotMatch(html,/bool optical=vRole|if\(role>12\.0&&role<13\.7\)/);
 assert.match(html,/vObj=canonical;vAlong=u;/,
  'Original ancestral skin pigment coordinates must remain unchanged');
 assert.match(html,/vColor=aColor;vRole=role;vObj=aPos;/,
  'Compatibility shader must retain the body pigment coordinates');
});

test('historic eyeDNA remains harmless to new body generation and crossover',()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const ctx=vm.createContext({document:{querySelectorAll:()=>[]},
  TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
 vm.runInContext(scripts[0],ctx);
 vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
 const data=vm.runInContext(`(()=>{
  const seed=731029,founder=makeFounderGenome(seed,2,2);
  const historical=copyJSON(founder);
  historical.eyeDNA={count:4,type:2,support:1,size:.8,compoundShape:3,lidStyle:1};
  const second=copyJSON(founder);second.seed=seed+7;second.eyeDNA={count:2,type:0,support:2};
  const result=crossoverGenome(historical,second,seed+100,0,.5);
  const palette=pickPalette(seed,founder.colorDNA,founder.patternDNA);
  const sp=makeSpecimen(seed,founder.style,palette,false,null,.7,.84,.75,founder.archetype,null,copyJSON(historical));
  const all=[...(sp.parts||[]),...(sp.localGroup?.parts||[])];
  return {founderHasEye:Object.prototype.hasOwnProperty.call(founder,'eyeDNA'),
   crossedEye:Object.prototype.hasOwnProperty.call(result.genome,'eyeDNA'),
   ocularParts:all.filter(p=>p.role==='eye'||p.kind==='eye'||p.eyeRig).length,
   eyesStat:sp.anatomy&&Object.prototype.hasOwnProperty.call(sp.anatomy,'eyes'),
   generatedTriangles:sp.shell.tri.length,bodyParts:all.length};
 })()`,ctx,{timeout:120000});
 assert.equal(data.founderHasEye,false,'Founder genomes should no longer allocate eye genes');
 assert.equal(data.crossedEye,false,'Old eyeDNA must not propagate to children');
 assert.equal(data.ocularParts,0,'Legacy saved DNA must not reconstruct any eyes');
 assert.equal(data.eyesStat,false,'Retired eye counts must not enter the active anatomy');
 assert.ok(data.generatedTriangles>0,'Removing eyes must not remove the body');
});

test('abandoned research is documented and unrelated luminous blinking remains',()=>{
 for(const phrase of ['162','8.2','16.4','60°','眼柄','交配','採用終了']){
  assert.ok(archive.includes(phrase),'Missing historical research detail: '+phrase);
 }
 assert.match(archive,/github\.com\/furuinu\/morphospace\/commit\//);
 assert.match(html,/function soundBlinkValue\(/);
 assert.match(html,/uniform float uBlinkMode/);
});
