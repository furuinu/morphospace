'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf(' // Swimming route depends on whole-organism symmetry;',html.indexOf('function stepPulseTravel('));
const end=html.indexOf(' const cycleIndex=Math.floor(phase/TAU);',start);
assert.ok(start>=0&&end>start,'whole-body travel classifier not found');
const mode=new Function('spec','seed','flat','axial','branch','normalizedArchitectureDNA',
 html.slice(start,end)+'return {layout,pathAxis,pathMode,pathSign};');
const classify=(spec,grammar)=>mode(spec,731029,.5,.5,.5,()=>({grammar}));
test('travel plane is derived from the FINISHED copy layout, not detached local organ axis',()=>{
 const m=classify({growthModel:{copyLayout:1,fusedSource:{bodyPlan:{axis:[0,1,0]}}}},5);
 assert.equal(m.layout,1);assert.equal(m.pathAxis,0);assert.equal(m.pathMode,'plane');
 const radial=classify({growthModel:{copyLayout:3}},1);
 assert.equal(radial.pathAxis,1);assert.equal(radial.pathMode,'line');
 const shell=classify({growthModel:{copyLayout:6}},1);
 assert.equal(shell.pathAxis,1);assert.equal(shell.pathMode,'line');
});
test('tentacle roots never override the swimming heading, and a protected anterior is aligned after body pose',()=>{
 const travel=html.slice(html.indexOf('function stepPulseTravel('),html.indexOf('// Dynamic pursuit:',html.indexOf('function stepPulseTravel(')));
 assert.doesNotMatch(travel,/axialTentacleRule|frontHasTentacle|tailSafe|tailAxis/);
 const idx=html.indexOf('const forward=spec.frontAxis?.length===3');
 assert.ok(idx>0);
 const slice=html.slice(idx,idx+780);
 assert.match(slice,/base\[0\]\*forward\[0\]\+base\[4\]\*forward\[1\]\+base\[8\]\*forward\[2\]/);
 assert.match(slice,/pulseAlignRotation\(posed,pulseTravel.direction,1\)/);
});
