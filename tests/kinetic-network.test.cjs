'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const ctx=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],ctx);
vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=fn=>vm.runInContext('('+fn.toString()+')()',ctx,{timeout:120000});
test('serial grammar mirrors each original anatomy into one synchronous station',()=>{
 const result=run(function(){
  const g=makeFounderGenome(813377,2,1);g.architectureDNA.grammar=7;g.structureDNA.mix=1;
  const em=architectureGrowth(g),net=createKineticNetwork(em),p=kineticNetworkPose(net,2.31,g.motionDNA,1);
  return {layout:em.copyLayout,copies:em.copyTransforms.length,stations:net.nodes.length,
   pair:em.copyTransforms.every((t,i)=>i%2||(
    Math.abs(t.p[0]+em.copyTransforms[i+1].p[0])<1e-9&&
    Math.abs(t.p[2]-em.copyTransforms[i+1].p[2])<1e-9&&
    !t.mirror&&em.copyTransforms[i+1].mirror&&
    net.copyNode[i]===net.copyNode[i+1])),
   active:p.some(x=>Math.hypot(...x.shift)>.001),bounded:p.every(x=>x.scale>=.91&&x.scale<=1.09)};
 });
 assert.equal(result.layout,7);
 assert.ok(result.stations>=3&&result.stations<=5);
 assert.equal(result.copies,result.stations*2);
 assert.equal(result.pair,true);
 assert.equal(result.active,true);
 assert.equal(result.bounded,true);
});
test('kinetic displacement is deterministic, link-constrained, zeroable and finite',()=>{
 const samples=run(function(){
  const out=[];
  for(let layout=1;layout<=7;layout++){
   const g=makeFounderGenome(912302+layout*151,layout%8,layout%8);
   g.architectureDNA.grammar=layout;g.structureDNA.mix=1;
   const net=createKineticNetwork(architectureGrowth(g));
   if(!net){out.push({layout,error:'missing network'});continue;}
   const a=kineticNetworkPose(net,8.1,g.motionDNA,1),b=kineticNetworkPose(net,8.1,g.motionDNA,1);
   const off=kineticNetworkPose(net,8.1,g.motionDNA,0);
   const limit=net.edges.every(([i,j])=>{
    const left=net.nodes[i].p.map((v,k)=>v+a[i].shift[k]),right=net.nodes[j].p.map((v,k)=>v+a[j].shift[k]);
    const rest=Math.hypot(...net.nodes[i].p.map((v,k)=>v-net.nodes[j].p[k]));
    return Math.hypot(...left.map((v,k)=>v-right[k]))<=rest*1.28+1e-5;
   });
   out.push({layout,finite:a.every(p=>[...p.shift,...p.angles,p.scale].every(Number.isFinite)),
    deterministic:JSON.stringify(a)===JSON.stringify(b),off:off.every(p=>p.shift.every(x=>x===0)&&p.scale===1),
    limit,connected:net.edges.length>=net.nodes.length-1});
  }
  return out;
 });
 assert.equal(samples.length,7);
 for(const item of samples){assert.equal(item.finite,true,'finite layout '+item.layout);assert.equal(item.deterministic,true);
  assert.equal(item.off,true);assert.equal(item.limit,true);assert.equal(item.connected,true);}
});
test('network temperament genes inherit and migrated genomes receive deterministic defaults',()=>{
 const data=run(function(){
  const a=makeFounderGenome(90144,2,4),b=makeFounderGenome(90145,1,3);
  const c=crossoverGenome(a,b,7551,2,.67).genome.motionDNA;
  const legacy={...a.motionDNA};for(const key of ['networkEnergy','networkWave','networkStartle'])delete legacy[key];
  const first=normalizedMotionDNA(legacy,a.seed,2,a.morphDNA),second=normalizedMotionDNA(legacy,a.seed,2,a.morphDNA);
  return {deterministic:JSON.stringify(first)===JSON.stringify(second),
   inRange:[c,first].every(x=>x.networkEnergy>=.24&&x.networkEnergy<=1&&x.networkWave>=0&&x.networkWave<=1&&x.networkStartle>=0&&x.networkStartle<=1)};
 });
 assert.equal(data.deterministic,true);assert.equal(data.inRange,true);
});
test('observation mode uses topology motion only for local instantiated copies',()=>{
 assert.match(html,/kineticNetwork:createKineticNetwork\(em\)/);
 assert.match(html,/kineticNetworkPose\(spec\.kineticNetwork,bodyTime/);
 assert.match(html,/const placed=node\?\{\.\.\.t,p:t\.p\.map/);
 assert.match(html,/setCopyMotionUniforms\(gl,u,null\)/);
});
