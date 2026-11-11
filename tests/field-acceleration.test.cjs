const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
run(`function testBody(seed,style){const g=makeFounderGenome(seed,style,seed%5);g.architectureDNA=normalizedArchitectureDNA(g.architectureDNA,seed,style*8+(g.archetype||0));return {g,em:architectureGrowth(g),palette:pickPalette(seed,g.colorDNA,g.patternDNA)};}`);

test('a block plan returns bit-identical field values and a positive bound really means outside',()=>{
 const r=plain(run(`(()=>{
  const rng=seedRng(20261111);let points=0,mismatch=0,falseOutside=0,outsideBlocks=0,dropped=0,total=0;
  for(const [seed,style] of [[11,0],[222,3],[3333,6],[44444,1],[5,4],[67,7],[901,2],[77,5]]){
   const {em}=testBody(seed,style);
   // Fused transition field and the single source anatomy, with growth collars as the detailed build has them.
   const source=em.fusedSource;
   source.appendageBases=[{root:[.2,.4,.1],dir:[0,1,0],length:.3,radius:.08,blend:.14},{root:[-.5,-.3,.2],dir:[.6,0,.8],length:.2,radius:.05,blend:.085}];
   for(const field of [em,source]){
    for(let b=0;b<140;b++){
     const radius=[.03,.08,.2,.6][b%4],c=[0,1,2].map(()=>(rng()*2-1)*field.bound);
     const plan=fieldBlockPlan(field,c[0],c[1],c[2],radius);if(!plan)continue;
     const list=p=>p.copies?p.copies.reduce((n,q)=>n+list(q),0):p.blobs.length+p.links.length+p.branches.length+p.membranes.length;
     const all=e=>e.blobs.length+e.links.length+(e.structures?e.structures.branches.length+e.structures.membranes.length:0);
     dropped+=(field.fusedSource?all(field.fusedSource)*field.copyTransforms.length:all(field))-list(plan);total+=field.fusedSource?all(field.fusedSource)*field.copyTransforms.length:all(field);
     if(plan.lo>0)outsideBlocks++;
     // A nested block planned from its parent must stay exact too.
     const inner=fieldBlockPlan(field,c[0]+radius*.3,c[1]-radius*.2,c[2]+radius*.1,radius*.5,plan);
     for(let n=0;n<10;n++){
      let v;do{v=[rng()*2-1,rng()*2-1,rng()*2-1]}while(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]>1);
      const s=n<2?1:rng(),x=c[0]+v[0]*radius*s,y=c[1]+v[1]*radius*s,z=c[2]+v[2]*radius*s;
      const full=morphSDF(x,y,z,field),fast=morphSDF(x,y,z,field,plan);points++;
      if(!Object.is(full,fast))mismatch++;
      if(plan.lo>0&&!(full>0))falseOutside++;
      if(inner){const q=[c[0]+radius*.3+v[0]*radius*.5*s,c[1]-radius*.2+v[1]*radius*.5*s,c[2]+radius*.1+v[2]*radius*.5*s];
       if(!Object.is(morphSDF(q[0],q[1],q[2],field),morphSDF(q[0],q[1],q[2],field,inner)))mismatch++;
       if(inner.lo>0&&!(morphSDF(q[0],q[1],q[2],field)>0))falseOutside++;}
     }
    }
   }
  }
  return {points,mismatch,falseOutside,outsideBlocks,share:dropped/total};})()`));
 assert.ok(r.points>15000);
 assert.equal(r.mismatch,0);
 assert.equal(r.falseOutside,0);
 assert.ok(r.outsideBlocks>100,'the bound is useful, not vacuous: '+r.outsideBlocks);
 assert.ok(r.share>.5,'most primitives are excluded per block: '+r.share);
});
test('the accelerated mesh is identical to sampling every lattice node',()=>{
 const r=plain(run(`(()=>{const res=[];
  for(const [seed,style,n] of [[222,0,33],[3333,6,29],[5,3,37]]){
   const {g,em,palette}=testBody(seed,style);
   for(const field of [em,em.fusedSource]){
    let evaluations=0;const sdf=morphSDF,planner=fieldBlockPlan;
    morphSDF=function(x,y,z,e,p){if(e===field)evaluations++;return sdf(x,y,z,e,p)};
    const fast=morphImplicitMesh(field,palette,g,false,n),fastEvaluations=evaluations;evaluations=0;
    fieldBlockPlan=()=>null;const full=morphImplicitMesh(field,palette,g,false,n);fieldBlockPlan=planner;morphSDF=sdf;
    const same=(a,b)=>a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
    res.push({same:same(fast.data,full.data)&&same(fast.tri,full.tri)&&same(fast.edges,full.edges),verts:fast.data.length/9,fastEvaluations,fullEvaluations:evaluations,nodes:n*n*n});
   }
  }return res})()`));
 for(const m of r){
  assert.ok(m.same&&m.verts>200,JSON.stringify(m));
  assert.equal(m.fullEvaluations,m.nodes,'reference samples the whole lattice');
  assert.ok(m.fastEvaluations<m.nodes*.6,'outside regions are skipped: '+m.fastEvaluations+' of '+m.nodes);
 }
});
test('unbounded or degenerate inputs fall back to full evaluation',()=>{
 const r=plain(run(`(()=>{const {em}=testBody(11,0),source=em.fusedSource;
  const zeroFuse=Object.assign({},source,{fuse:0}),badCopy=Object.assign({},em,{copyTransforms:em.copyTransforms.map(t=>Object.assign({},t,{scale:-1}))});
  const flat=Object.assign({},source,{blobs:source.blobs.map((b,i)=>i?b:Object.assign({},b,{axes:[b.axes[0],0,b.axes[2]]}))});
  return [sourceBlockPlan(zeroFuse,0,0,0,.1),fieldBlockPlan(badCopy,0,0,0,.1),sourceBlockPlan(flat,0,0,0,.1)].map(p=>p===null);})()`));
 assert.deepEqual(r,[true,true,true]);
});
test('observation meshes use the higher lattice while the vertex budget fallback remains',()=>{
 assert.ok(html.includes('const resolution=copyCount<=2?71:copyCount===3?67:copyCount===4?63:59;'));
 assert.ok(html.includes('for(let n=resolution;n>=19;n=Math.max(19,n-4)){'));
 assert.ok(html.includes("if(xyz.length>60000)throw new Error('成長メッシュが頂点上限を超えました');"));
});
