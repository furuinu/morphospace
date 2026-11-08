'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function fragment(a,b){const start=html.indexOf(a),end=html.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,'Missing source region: '+a);return html.slice(start,end)}
const dna=fragment('const STRUCTURE_FIELDS=','const MORPH_FIELDS=');
const organ=fragment('function hierarchicalOrganGrowth(','function morphGrowth(g){');
const ctx=vm.createContext({});
vm.runInContext(`
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const seedRng=seed=>{let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296)};
`+dna+organ+`globalThis.api={structureFounderDNA,structureCrossoverDNA,hierarchicalOrganGrowth};`,ctx);
const api=ctx.api,copy=x=>JSON.parse(JSON.stringify(x));
function base(){return {blobs:[{p:[0,0,0],axes:[.8,.8,.8]},{p:[.35,.28,.2],axes:[.23,.2,.23]}],links:[],cuts:[],bound:2.1,structures:{branches:[],membranes:[],tunnels:[]}}}
test('seeded organ family has a rooted local 2/3/4-fold symmetry independent of the global copy layout',()=>{
 for(const order of [2,3,4]){
  const d=copy(api.structureFounderDNA(78122+order,2));
  d.localSymmetry=order===2?.1:order===3?.5:.96;
  d.coherence=1;d.repeat=.28;d.branch=.8;d.membrane=.8;
  const g={seed:78122+order,structureDNA:d};
  const a=api.hierarchicalOrganGrowth(g,base(),true),b=api.hierarchicalOrganGrowth(g,base(),true);
  assert.deepEqual(copy(a),copy(b),'identical DNA must build identical anatomy');
  assert.equal(a.organModules.length,1);
  const module=a.organModules[0];
  assert.equal(module.order,order);
  assert.equal(module.tips.length,order);
  assert.equal(a.structures.branches.length,order+1,'one shared stalk followed by locally repeated organs');
  assert.ok(a.structures.branches[0].a.every((v,i)=>Math.abs(v-module.anchor[i])<1e-9));
  assert.ok(a.structures.branches.slice(1).every(b=>b.a.every((v,i)=>Math.abs(v-module.pole[i])<1e-9)));
 }
});
test('hierarchical station count, complexity and spatial bounds remain safe across 140 genomes',()=>{
 let multi=0;
 for(let i=1;i<=140;i++){
  const d=copy(api.structureFounderDNA(i*197,3));const g={seed:i*197,structureDNA:d};
  const specimen=api.hierarchicalOrganGrowth(g,base(),i%2===0);
  if(specimen.organModules.length>1)multi++;
  assert.ok(specimen.structures.branches.length<=(i%2===0?22:15));
  assert.ok(specimen.structures.membranes.length<=(i%2===0?4:3));
  assert.ok(specimen.bound>=2.1&&specimen.bound<=4.4);
  for(const mod of specimen.organModules)for(const p of [mod.anchor,mod.pole,...mod.tips])assert.ok(p.every(Number.isFinite));
 }
 assert.ok(multi>0,'two spatial stations must occur for repeated body modules');
});
test('new genome loci inherit and missing loci in archived DNA use deterministic defaults',()=>{
 const a=copy(api.structureFounderDNA(731029,1)),b=copy(api.structureFounderDNA(912451,2));
 for(const k of ['repeat','localSymmetry','gradient','coherence'])assert.ok(a[k]>=0&&a[k]<=1);
 const child=copy(api.structureCrossoverDNA(a,b,871231,.75,[],{}));
 for(const k of ['repeat','localSymmetry','gradient','coherence'])assert.ok(child[k]>=0&&child[k]<=1);
 const old=copy(a);for(const k of ['repeat','localSymmetry','gradient','coherence'])delete old[k];
 const g={seed:731029,structureDNA:old};
 const q=api.hierarchicalOrganGrowth(g,base(),true),p=api.hierarchicalOrganGrowth(g,base(),true);
 assert.deepEqual(copy(q),copy(p));
 assert.deepEqual(old,copy(g.structureDNA),'old DNA must not be silently rewritten');
});
test('the actual anatomy is modified before existing whole-body copy transformations',()=>{
 assert.match(html,/if\(g\.structureDNA\?\.version===1\)hierarchicalOrganGrowth\(g,base,developmental\)/);
 assert.match(html,/fusedSource:\{\.\.\.base,copyLayout:0\}/);
 assert.match(html,/if\(em\.structures\)acc=structureSDF\(x,y,z,em,acc\)/);
});
