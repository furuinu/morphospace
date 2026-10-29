'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const ctx=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],ctx);
vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=fn=>vm.runInContext('('+fn.toString()+')()',ctx,{timeout:120000});
test('twelve grammars each produce nonempty bounded implicit growth geometry',()=>{
 const families=run(function(){
  const results=[];
  for(let i=0;i<12;i++){
   const seed=731029+i*197,genome=makeFounderGenome(seed,i%8,i%8);
   genome.architectureDNA={...genome.architectureDNA,grammar:i,mode:1,order:4};
   const palette=pickPalette(seed,genome.colorDNA,genome.patternDNA);
   const sp=makeSpecimen(seed,genome.style,palette,true,null,.7,.84,.75,genome.archetype,null,copyJSON(genome));
   const em=sp.growthModel;
   results.push({id:i,tri:sp.shell.tri.length/3,blobs:em.blobs.length,links:em.links.length,mirror:sp.__mirrorRender,
    finite:Array.from(sp.shell.data).every(Number.isFinite),bounds:em.bound,code:sp.morphology.name});
  }
  return results;
 });
 assert.equal(families.length,12);
 assert.equal(new Set(families.map(x=>x.code)).size,12);
 for(const a of families){
  assert.ok(a.tri>8,'grammar '+a.id+' generated no visible 3D body');
  assert.ok(a.blobs<=26&&a.links<=32,'grammar '+a.id+' exceeded its complexity budget');
  assert.ok(a.bounds>=2&&a.bounds<=4.4);
  assert.equal(a.mirror,false,'one generated body should render once');
  assert.ok(a.finite,'grammar '+a.id+' generated nonfinite positions');
 }
});
test('bilateral, threefold and 3D vertex symmetry are distinct bounded direction sets',()=>{
 const cases=run(function(){return [[0,2],[1,3],[1,4],[1,6],[1,8],[2,4],[2,6],[2,8]].map(([mode,order])=>({mode,order,points:architectureDirections(mode,order)}))});
 for(const item of cases){
  assert.equal(item.points.length,item.order);
  for(const p of item.points)assert.ok(Math.abs(Math.hypot(...p)-1)<1e-6);
  assert.equal(new Set(item.points.map(p=>p.map(x=>x.toFixed(5)).join(','))).size,item.order);
 }
 assert.equal(cases[1].points.every(p=>p[1]===0),true);
 assert.ok(cases[5].points.some(p=>p[1]!==0),'tetrahedral must be truly 3D');
});
test('founder distribution covers twelve grammars and crossover transmits structural genes',()=>{
 const data=run(function(){
  const all=Array.from({length:64},(_,i)=>makeFounderGenome(120001+i*1237,Math.floor(i/8),i%8));
  const grammars=new Set(all.map(g=>g.architectureDNA.grammar));
  const symmetries=new Set(all.map(g=>g.architectureDNA.mode+':'+g.architectureDNA.order));
  let inherited=0,mutations=0,valid=0;
  for(let i=0;i<35;i++){
   const result=crossoverGenome(all[i],all[i+1],731029+i*971,4,.75);
   const d=result.genome.architectureDNA;
   if(result.inherited.architecture)inherited++;
   mutations+=result.mutationLog.filter(x=>x.field.startsWith('architectureDNA.')).length;
   if(d.grammar>=0&&d.grammar<12&&d.order>=2&&d.order<=8)valid++;
  }
  return {grammars:grammars.size,symmetries:symmetries.size,inherited,mutations,valid};
 });
 assert.equal(data.grammars,12);
 assert.ok(data.symmetries>=5);
 assert.equal(data.inherited,35);
 assert.equal(data.valid,35);
 assert.ok(data.mutations>0);
});
test('archived DNA without architectural genes resolves deterministically through one renderer',()=>{
 const state=run(function(){
  const g=makeFounderGenome(123451,2,4);delete g.architectureDNA;
  const a=normalizedArchitectureDNA(g.architectureDNA,g.seed,g.style*8+g.archetype),b=normalizedArchitectureDNA(g.architectureDNA,g.seed,g.style*8+g.archetype);
  const sp=makeSpecimen(g.seed,g.style,pickPalette(g.seed,g.colorDNA,g.patternDNA),true,null,.7,.84,.75,g.archetype,null,copyJSON(g));
  return {same:JSON.stringify(a)===JSON.stringify(b),migrated:!!sp.genome.architectureDNA,
   renderOnce:sp.__mirrorRender===false};
 });
 assert.deepEqual(JSON.parse(JSON.stringify(state)),{same:true,migrated:true,renderOnce:true});
 assert.match(html,/if\(!hidden&&spec\.__mirrorRender\)drawCopy\(mirrorM,true\)/);
});
