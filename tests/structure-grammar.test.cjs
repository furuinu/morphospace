'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function source(a,b){const start=html.indexOf(a),end=html.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,'Missing morphology function '+a);return html.slice(start,end)}
const dna=source('const STRUCTURE_FIELDS=','const MORPH_FIELDS=');
const growth=source('function structureGrowth(','function morphGrowth(');
const ctx=vm.createContext({Math});
vm.runInContext(`
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const seedRng=seed=>{let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)};
`+dna+growth+`globalThis.api={structureFounderDNA,structureCrossoverDNA,photoStructureDNA,structureGrowth,structureSDF};`,ctx);
const api=ctx.api;
const copy=x=>JSON.parse(JSON.stringify(x));
function base(){return {blobs:[{p:[0,0,0],axes:[.9,.8,.7]},{p:[.7,.2,.1],axes:[.2,.2,.2]}],links:[],cuts:[],bound:2.2}}
test('old specimens without structureDNA retain their original growth body',()=>{
 const b=base(),snapshot=copy(b);
 assert.equal(api.structureGrowth({seed:11},b),b);
 assert.deepEqual(copy(b),snapshot);
});
test('new structural DNA deterministically produces branch paths, twisted sheets and tunnels',()=>{
 const d={...copy(api.structureFounderDNA(78921,2)),branch:.98,membrane:.98,cavity:.95};
 const a=api.structureGrowth({seed:78921,structureDNA:d},base());
 const b=api.structureGrowth({seed:78921,structureDNA:d},base());
 assert.deepEqual(copy(a),copy(b));
 assert.ok(a.structures.branches.length>=2&&a.structures.branches.length<=10);
 assert.ok(a.structures.membranes.length>=1&&a.structures.membranes.length<=2);
 assert.ok(a.structures.tunnels.length>=1&&a.structures.tunnels.length<=2);
 for(const p of [[0,0,0],[.1,.3,.5],[5,5,5]])assert.ok(Number.isFinite(api.structureSDF(...p,a,-.8)));
});
test('real subtractive tunnel removes inside volume rather than painting a surface marking',()=>{
 const s={structures:{branches:[],membranes:[],tunnels:[{center:[0,0,0],axis:[0,0,1],radius:.3,half:1}]}};
 assert.ok(api.structureSDF(0,0,0,s,-.8)>0);
 assert.ok(api.structureSDF(.5,0,0,s,-.8)<0);
});
test('membranes occupy a separate thin, broad sheet volume',()=>{
 const s={structures:{branches:[],tunnels:[],membranes:[{center:[2,0,0],u:[1,0,0],v:[0,1,0],n:[0,0,1],len:.8,width:.9,thick:.1,fold:.1,twist:.2,phase:0}]}};
 assert.ok(api.structureSDF(2,0,0,s,10)<0);
 assert.ok(api.structureSDF(2,0,1,s,10)>0);
 assert.ok(api.structureSDF(2,2,0,s,10)>0);
});
test('photo and mating share the inherited numeric grammar',()=>{
 const p={seed:123456,points:[[.8,0,.8,.5],[-.5,.9,.7,.2],[.1,-.6,.4,.3]]};
 const d=copy(api.photoStructureDNA(p,123456));assert.equal(d.seed,123456);
 for(const k of ['branch','membrane','cavity','twist','spread','phase','mix'])assert.ok(d[k]>=0&&d[k]<=1);
 const log=[],inherited={},offspring=api.structureCrossoverDNA(d,copy(api.structureFounderDNA(222,4)),333,.7,log,inherited);
 assert.equal(offspring.seed,333);assert.equal(inherited.structure,'mixed');
 assert.match(html,/g\.structureDNA=structureCrossoverDNA\(/);
 assert.match(html,/g\.structureDNA=photoStructureDNA\(/);
 assert.match(html,/structureGrowth\(g,photoAnatomy\)/);
 assert.match(html,/if\(em\.structures\)acc=structureSDF\(x,y,z,em,acc,plan\)/);
});
