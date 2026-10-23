const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));

test('surface material and relationship chromosomes remain bounded across 40 generations without changing parents',()=>{
 const result=run(`(()=>{let a=makeFounderGenome(731029,0,4),b=makeFounderGenome(571938,1,3),mutations=0,sources=new Set();
 for(let generation=0;generation<40;generation++){
  const before=JSON.stringify([a,b]),offspring=crossoverGenome(a,b,89711+generation*317,3,.75);
  if(before!==JSON.stringify([a,b]))throw Error('parent DNA changed');
  for(const [key,[lo,hi]]of Object.entries(SURFACE_LIMITS)){const v=offspring.genome.surfaceDNA[key];if(!Number.isFinite(v)||v<lo-.00001||v>hi+.00001)throw Error('unbounded '+key);}
  for(const key of ['material','relationship','identity'])sources.add(offspring.inherited['surface_'+key]);
  mutations+=offspring.mutationLog.filter(x=>x.field.startsWith('surfaceDNA.')).length;
  b=a;a=offspring.genome;
 }return {mutations,sources:[...sources].sort()};})()`);
 assert.ok(result.mutations>20);assert.deepEqual(plain(result.sources),['A','B']);
});

test('same-parent surface crossing keeps the parent field when variation is zero, while legacy DNA upgrades deterministically',()=>{
 const result=run(`(()=>{const parent=makeFounderGenome(77191,2,5),original=copyJSON(parent.surfaceDNA);let preserved=true;
 // Mutation is probabilistic even at strength zero; unchanged fields must keep
 // the exact parental value rather than being reseeded by the child's seed.
 for(let i=0;i<32;i++){const log=[],d=surfaceCrossoverDNA(parent,parent,9000+i,0,log,{});for(const key of Object.keys(SURFACE_LIMITS))if(!log.some(x=>x.field==='surfaceDNA.'+key)&&Math.abs(d[key]-original[key])>.00001)preserved=false;}
 delete parent.surfaceDNA;const a=surfaceCrossoverDNA(parent,parent,381,0,[],{}),b=surfaceCrossoverDNA(parent,parent,381,0,[],{});
 return {preserved,stable:JSON.stringify(a)===JSON.stringify(b),untouched:!parent.surfaceDNA};})()`);
 assert.deepEqual(plain(result),{preserved:true,stable:true,untouched:true});
});

test('share links preserve the complete surface field and legacy links still decode',()=>{
 const result=run(`(()=>{const g=makeFounderGenome(731029,0,4),p={version:1,record:{id:'surface-test',name:'表面標本',seed:g.seed,style:g.style,genome:g,generation:2,parents:[]},view:{}};
 const restored=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(p));
 const same=JSON.stringify(restored.record.genome.surfaceDNA)===JSON.stringify(g.surfaceDNA);
 delete p.record.genome.surfaceDNA;const legacy=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(p));return {same,legacy:!legacy.record.genome.surfaceDNA};})()`);
 assert.deepEqual(plain(result),{same:true,legacy:true});
});

test('gallery and detailed meshes bind the same inherited relief without changing geometry or pigment DNA',()=>{
 const result=run(`(()=>{const g=makeFounderGenome(731029,0,4),before=JSON.stringify(g),make=low=>makeSpecimen(g.seed,g.style,pickPalette(g.seed,g.colorDNA,g.patternDNA),low,null,.75,.84,.75,4,null,copyJSON(g));
 const a=make(true),b=make(false),changed=copyJSON(g);changed.surfaceDNA.depth=.85;changed.surfaceDNA.asymmetry=.65;
 const c=makeSpecimen(g.seed,g.style,pickPalette(g.seed,g.colorDNA,g.patternDNA),false,null,.75,.84,.75,4,null,changed);
 return {same:JSON.stringify(a.palette.surfaceDNA)===JSON.stringify(b.palette.surfaceDNA),stable:before===JSON.stringify(g),geometry:b.shell.data.every((x,i)=>x===c.shell.data[i]),triangles:b.triangles===c.triangles};})()`);
 assert.deepEqual(plain(result),{same:true,stable:true,geometry:true,triangles:true});
});

test('ordinary draws reset relief DNA and morph endpoint snapshots include independent fields',()=>{
 const result=run(`(()=>{const uniforms=Object.fromEntries(TEXTURE_ENDPOINT_UNIFORMS.map(n=>[n,n]));uniforms.uSurfaceActivity='active';uniforms.uTextureMix='mix';
 const values={},gl={uniform1f:(u,x)=>values[u]=x,uniform2f:()=>{},uniform3fv:()=>{},uniform4fv:(u,x)=>values[u]=Array.from(x)};
 const p=pickPalette(731029);p.surfaceDNA=surfaceFounderDNA(731029);applyPatternUniforms(gl,uniforms,p);const bound=values.uSurface0[0]>0;
 applyPatternUniforms(gl,uniforms,pickPalette(999));return {bound,reset:values.uSurface0[0]===0&&values.mix===0,next:textureMorphUniforms(Object.fromEntries(TEXTURE_ENDPOINT_UNIFORMS.map(n=>['uNext'+n.slice(1),'next-'+n]))).uSurface1};})()`);
 assert.deepEqual(plain(result),{bound:true,reset:true,next:'next-uSurface1'});
});
