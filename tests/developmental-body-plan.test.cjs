'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('// Developmental body plan:');
const end=html.indexOf('function morphGrowth(g){',start);
assert.ok(start>=0&&end>start,'developmental body-plan engine missing');
const ctx=vm.createContext({});
vm.runInContext(`
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const seedRng=seed=>{let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)};
`+html.slice(start,end)+'globalThis.organogenesis=developmentalBodyPlan;',ctx);
const plan=ctx.organogenesis,copy=x=>JSON.parse(JSON.stringify(x));
function base(){return {blobs:[
 {p:[0,0,0],axes:[.9,.72,.85]},{p:[.7,.3,.1],axes:[.22,.25,.22]},
 {p:[-.46,.4,-.2],axes:[.31,.2,.25]}
 ],links:[],cuts:[],bound:2,structures:{branches:[],membranes:[],tunnels:[]}}}
const g={seed:731029,morphDNA:{asymmetry:.72},structureDNA:{version:1,seed:428123,branch:.91,membrane:.84,cavity:.56,twist:.68,spread:.72,phase:.19,mix:.42}};
test('homologous organs share developmental stations but are not mirrored copies',()=>{
 const result=plan(g,base()),again=plan(g,base());
 assert.deepEqual(copy(result),copy(again),'DNA+seed must determine an identical organism');
 assert.equal(result.bodyPlan.copyCount,1);
 assert.ok(result.bodyPlan.stations>=2);
 assert.ok(result.structures.branches.length>=8);
 assert.ok(result.structures.membranes.length>=2);
 for(const homologs of result.bodyPlan.pairs){
  assert.equal(homologs.length,2);
  assert.equal(homologs[0].side,-1);assert.equal(homologs[1].side,1);
  const left=homologs[0].length,right=homologs[1].length;
  assert.ok(left>0&&right>0);
  assert.ok(Math.abs(left-right)/Math.max(left,right)<.3,'sides must develop related proportions');
 }
 assert.ok(result.bodyPlan.pairs.some(p=>Math.abs(p[0].length-p[1].length)>1e-4),'differentiation must avoid exact mirroring');
});
test('developmental geometry remains bounded under representative DNA samples',()=>{
 for(let seed=1;seed<=72;seed++){
  const genome={...g,seed,structureDNA:{...g.structureDNA,seed:seed*17,branch:seed/72,membrane:(73-seed)/72,phase:(seed%17)/17}};
  const anatomy=plan(genome,base());
  const structures=anatomy.structures;
  assert.ok(structures.branches.length<=18);
  assert.ok(structures.membranes.length<=4);
  assert.ok(anatomy.bound>=2&&anatomy.bound<=4.4);
  const points=[...structures.branches.flatMap(b=>[b.a,b.b]),...structures.membranes.map(m=>m.center)];
  assert.ok(points.flat().every(Number.isFinite));
 }
});
test('old genomes without structureDNA are not subjected to the new organ-growth rule',()=>{
 const specimen=base(),before=copy(specimen);
 assert.equal(plan({seed:731029,morphDNA:g.morphDNA},specimen),specimen);
 assert.deepEqual(copy(specimen),before);
});
test('developmental source organogenesis always feeds a multi-copy final anatomy',()=>{
 assert.match(html,/const developmental=!!\(!g\.photoDNA&&g\.structureDNA\?\.version===1&&g\.structureDNA\.mix<\.74\)/);
 assert.match(html,/const base=developmental\?developmentalBodyPlan\(g,morphGrowth\(g\)\):morphGrowth\(g\)/);
 assert.match(html,/layout=arch\.grammar===7\?7:\(arch\.grammar>=1&&arch\.grammar<=6\?arch\.grammar:1\)/);
 assert.doesNotMatch(html,/if\(layout===0\)add\(\[0,0,0\]\)/);
 assert.match(html,/if\(layouts\.length<2\)throw new Error/);
});
