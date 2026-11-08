'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf(' const architecture=normalizedArchitectureDNA(',html.indexOf('function stepPulseTravel('));
const end=html.indexOf(' // Classify axial tentacles by their ROOT positions',start);
assert.ok(start>=0&&end>start,'production movement classification not found');
const V={norm:p=>{const len=Math.hypot(...p)||1;return p.map(x=>x/len)}};
const mode=new Function('spec','seed','flat','axial','branch','V','normalizedArchitectureDNA',
 html.slice(start,end)+'return {layout,pathMode,pathAxis,growthAxis};');
const classify=(spec,grammar,flat=.5,axial=.5,branch=.5)=>mode(spec,731029,flat,axial,branch,V,()=>({grammar}));
test('single-body anatomy overrides the old symmetry grammar for locomotion',()=>{
 const sp={growthModel:{copyLayout:0,fusedSource:{bodyPlan:{axis:[.32,.93,.19]}}}};
 const m=classify(sp,1);
 assert.equal(m.layout,0,'physical layout must not be mistaken for inherited bilateral copy');
 assert.equal(m.pathMode,'line');
 assert.equal(m.pathAxis,1);
 assert.ok(Math.abs(m.growthAxis[1]-.93/Math.hypot(.32,.93,.19))<1e-9);
 assert.match(html,/pulseTravel\.targetDirection=V\.scale\(growthAxis,pathSign\)/);
});
test('spatial-copy species retain plane movement rules',()=>{
 const sp={growthModel:{copyLayout:1}};
 const m=classify(sp,5);
 assert.equal(m.layout,1);
 assert.equal(m.pathMode,'plane');
 assert.equal(m.pathAxis,0);
 assert.equal(m.growthAxis,null);
});
test('body-frame movement is deterministic and changes with anatomical orientation',()=>{
 const a=classify({growthModel:{copyLayout:0,bodyPlan:{axis:[1,0,0]}}},1);
 const b=classify({growthModel:{copyLayout:0,bodyPlan:{axis:[0,0,-1]}}},1);
 assert.equal(a.pathAxis,0);assert.equal(b.pathAxis,2);
 assert.deepEqual(a.growthAxis,[1,0,0]);
 assert.deepEqual(b.growthAxis,[0,0,-1]);
});
