'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function between(start,end){const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'source not found '+start);return html.slice(a,b)}
const dna=between('function architectureFounderDNA(','function architectureDirections(');
const copied=between('function copiedAnatomy(','function architectureGrowth(');
const sdf=between('function morphSDF(','// Pigment fields use');
const stubs=String.raw`
const TAU=2*Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const seedRng=seed=>{let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)};
const ARCH_SYM_CHOICES=[[0,2],[1,3],[1,4],[1,6],[1,8],[2,4],[2,6],[2,8]];
const ARCH_GROWTH_FIELDS=['mass','reach','lobes','membrane','branching','cavity','polarity','anisotropy','segmentation'];
const morphGrowth=()=>({blobs:[{p:[0,0,0],axes:[.72,.65,.8],s:0,c:1,kind:'nucleus'}],
 links:[],cuts:[],fuse:.14,rough:.04,bound:2.2,d:{twist:.2,shear:.2,flat:.3,lobation:.5}});
const developmentalBodyPlan=(g,b)=>b,hierarchicalOrganGrowth=()=>{};
`;
const api=new Function(stubs+dna+copied+sdf+
 'return {copiedAnatomy,morphSDF,normalizedArchitectureDNA,architectureFounderDNA};')();
const photo={version:1,source:'camera',seed:128442,points:[[.2,.3,.8,.4],[-.4,.6,.9,.2],[.7,-.3,.6,.9]]};
const genome=(grammar,seed=731029)=>({seed,style:0,archetype:0,photoDNA:photo,
 structureDNA:{version:1,mix:.2},morphDNA:{asymmetry:.5},
 architectureDNA:{version:4,grammar,chirality:.5,distortion:0,fusion:.5}});
test('a photograph is copied by all six whole-body grammars instead of forced to identity layout',()=>{
 const samples=[];
 for(let grammar=1;grammar<=6;grammar++){
  const em=api.copiedAnatomy(genome(grammar));
  assert.equal(em.copyLayout,grammar);
  assert.ok(em.copyTransforms.length>=2);
  assert.ok(em.blobs.length>=1&&em.blobs.length<=26);
  assert.ok(em.bound<=4.4);
  assert.ok(Array.from([em.copyTransforms[0].p,[0,0,0],[2,1,0]]).every(p=>Number.isFinite(api.morphSDF(...p,em))));
  samples.push(em.copyTransforms.length);
 }
 assert.ok(samples[5]>=8&&samples[5]<=12);
 assert.match(html,/const developmental=!!\(!g\.photoDNA&&/);
 assert.match(html,/g\.architectureDNA=\{\.\.\.g\.architectureDNA,grammar\}/);
});
test('spiral specimens repeat with strictly decreasing scale and deterministic handedness',()=>{
 const a=api.copiedAnatomy(genome(6,129990)),b=api.copiedAnatomy(genome(6,129990));
 assert.deepEqual(JSON.parse(JSON.stringify(a.copyTransforms)),JSON.parse(JSON.stringify(b.copyTransforms)));
 for(let i=1;i<a.copyTransforms.length;i++)assert.ok(a.copyTransforms[i].scale<a.copyTransforms[i-1].scale);
 assert.equal(a.spiralTip.length,18);
 assert.ok(a.copyTransforms.length<=12);
 const left=api.copiedAnatomy({...genome(6,129990),architectureDNA:{...genome(6,129990).architectureDNA,chirality:-.5}});
 assert.notDeepEqual(JSON.parse(JSON.stringify(left.copyTransforms)),JSON.parse(JSON.stringify(a.copyTransforms)));
});
test('spiral taper has genuine continuous signed-distance volume',()=>{
 const em=api.copiedAnatomy(genome(6,193331));
 for(const step of em.spiralTip){
  assert.ok(step.r0>=step.r1&&step.r1>0);
  assert.ok(Number.isFinite(api.morphSDF(...step.b,em)));
 }
 const mid=em.spiralTip[Math.floor(em.spiralTip.length/2)];
 assert.ok(api.morphSDF(...mid.b,em)<0);
});
test('new genome grammar persists and photo generation exposes explicit and automatic choices',()=>{
 const g=genome(6);
 assert.equal(api.normalizedArchitectureDNA(g.architectureDNA,g.seed,0).grammar,6);
 assert.equal(new Set(Array.from({length:64},(_,i)=>api.architectureFounderDNA(100000+i*791,i).grammar)).size,6);
 assert.match(html,/id="photoCopyGrammar"/);
 assert.match(html,/photoGrammar:\$\('photoCopyGrammar'\)\.value/);
 assert.match(html,/1\+\(cx\.photoDNA\.seed>>>0\)%6/);
 assert.match(html,/uniform vec4 uCopyPos\[12\];uniform vec4 uCopyRot\[12\]/);
 assert.match(html,/slice\(0,12\),p=new Float32Array\(48\)/);
});