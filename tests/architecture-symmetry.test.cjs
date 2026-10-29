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

test('one copy layout retains varied ancestral free-growth shapes and bounded complexity',()=>{
 const data=run(function(){
  const forms=new Set(),radii=[],genes=new Set(),counts=[];
  for(let i=0;i<90;i++){
   const seed=80000+i*1039,g=makeFounderGenome(seed,0,0);
   g.architectureDNA.grammar=0;
   const base=morphGrowth(g),em=architectureGrowth(g);
   const radius=Math.max(0,...em.blobs.map(b=>Math.hypot(...b.p)+Math.max(...b.axes)));
   forms.add(base.blobs.length+':'+base.links.length+':'+base.cuts.length);
   genes.add(JSON.stringify(g.morphDNA));
   radii.push(radius);counts.push([em.blobs.length,em.links.length]);
  }
  return {forms:forms.size,genes:genes.size,spread:Math.max(...radii)-Math.min(...radii),
   bounded:counts.every(x=>x[0]<=26&&x[1]<=32)};
 });
 assert.ok(data.forms>=8,'free growth must vary its anatomy within a layout');
 assert.ok(data.genes>=80,'distinct morph DNA must reach the ancestral generator');
 assert.ok(data.spread>.35,'layout zero must not collapse all body sizes');
 assert.equal(data.bounded,true);
});
test('population exercises distinct copy layouts without exceeding mobile SDF bounds',()=>{
 const data=run(function(){
  const layouts=new Set(),counts=[],range=[];
  for(let i=0;i<96;i++){
   const seed=120001+i*1237,g=makeFounderGenome(seed,Math.floor(i/8)%8,i%8);
   g.architectureDNA.grammar=i%12;
   const em=architectureGrowth(g);
   layouts.add(em.copyLayout);
   counts.push([em.blobs.length,em.links.length,em.bound,em.cuts.length]);
   range.push(Math.max(0,...em.blobs.map(b=>Math.hypot(...b.p)+Math.max(...b.axes))));
  }
  return {layouts:layouts.size,
   safe:counts.every(x=>x[0]>0&&x[0]<=26&&x[1]<=32&&x[2]>=2&&x[2]<=4.4&&x[3]>=0),
   variation:Math.max(...range)-Math.min(...range)};
 });
 assert.equal(data.layouts,12);
 assert.equal(data.safe,true,'all copy layouts must respect mobile memory budgets');
 assert.ok(data.variation>.3,'copy layouts must produce differing extents');
});
test('mass gene survives crossing and missing mass in saved genomes migrates deterministically',()=>{
 const state=run(function(){
  const original=makeFounderGenome(912403,0,1),mate=makeFounderGenome(503219,1,4);
  const previous={...original.architectureDNA};delete previous.mass;
  const restoreA=normalizedArchitectureDNA(previous,original.seed,original.style*8+original.archetype);
  const restoreB=normalizedArchitectureDNA(previous,original.seed,original.style*8+original.archetype);
  const child=crossoverGenome(original,mate,146073,2,.75).genome;
  return {deterministic:restoreA.mass===restoreB.mass,inRange:restoreA.mass>=.05&&restoreA.mass<=1,
   inheritedMass:Number.isFinite(child.architectureDNA.mass)&&child.architectureDNA.mass>=.05&&child.architectureDNA.mass<=1};
 });
 assert.deepEqual(JSON.parse(JSON.stringify(state)),{deterministic:true,inRange:true,inheritedMass:true});
});
test('bilateral copy layout mirrors original anatomy in 3D SDF',()=>{
 const errors=run(function(){
  const errors=[];
  for(let i=0;i<12;i++){
   const seed=731029+i*197,g=makeFounderGenome(seed,i%8,i%8);
   g.architectureDNA={...g.architectureDNA,grammar:1,mode:0,order:2};
   const em=architectureGrowth(g),points=[[.44,.2,.13],[.87,.2,.26],[1.07,.4,.1],[.61,-.33,.27],[1.35,.12,.44]];
   errors.push(Math.max(...points.map(q=>Math.abs(morphSDF(q[0],q[1],q[2],em)-morphSDF(-q[0],q[1],q[2],em)))));
  }
  return errors;
 });
 assert.equal(errors.length,12);
 for(const e of errors)assert.ok(e<.005,'mirrored anatomy differs across x: '+e);
});
test('new architectural traits are heritable, not merely the name of a body plan',()=>{
 const traits=run(function(){
  const g=makeFounderGenome(700091,2,4),m=makeFounderGenome(179072,4,3),traits=['mass','reach','lobes','membrane','branching','cavity','polarity','anisotropy','segmentation'];
  const child=crossoverGenome(g,m,222333,4,.8).genome.architectureDNA;
  const saved=JSON.parse(JSON.stringify(g));delete saved.architectureDNA.version;
  const migrated=normalizedArchitectureDNA(saved.architectureDNA,g.seed,g.style*8+g.archetype);
  return {fields:traits.every(k=>Number.isFinite(child[k])&&child[k]>=0&&child[k]<=1),
   migrated:traits.every(k=>Number.isFinite(migrated[k])),migratedVersion:migrated.version};
 });
 assert.equal(traits.fields,true);
 assert.equal(traits.migrated,true);
 assert.equal(traits.migratedVersion,2);
});
