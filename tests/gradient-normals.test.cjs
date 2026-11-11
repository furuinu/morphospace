const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const mesher=html.slice(html.indexOf('function morphImplicitMesh('),html.indexOf('function fieldGradientNormals('));

test('growth-field gradient replaces triangle normals without extra field evaluations',()=>{
 const gradient=mesher.slice(mesher.indexOf('const fieldGradient='),mesher.indexOf('const tet='));
 assert.ok(!gradient.includes('morphSDF(')&&gradient.split('sample(').length-1===6,'gradients read lattice samples only');
 assert.ok(mesher.includes('fieldGradientNormals(buildMesh(xyz,colors,tri),grads)'));
 assert.ok(mesher.includes('const ga=fieldGradient(ai,aj,ak),gb=fieldGradient(bi,bj,bk);'));
});
test('agreeing gradients are adopted; disagreeing or degenerate ones keep the triangle normal',()=>{
 const out=plain(run(`(()=>{
  const mesh={data:new Float32Array(9*4)};
  for(let i=0;i<4;i++)mesh.data.set([0,0,0, 0,0,1, 1,1,1],i*9);
  // 0: slightly tilted gradient, 1: opposing gradient, 2: zero gradient, 3: borderline (~60 degrees)
  fieldGradientNormals(mesh,[[.3,0,3],[0,0,-5],[0,0,0],[Math.sin(Math.PI/3),0,Math.cos(Math.PI/3)]]);
  return [0,1,2,3].map(i=>Array.from(mesh.data.slice(i*9+3,i*9+6)));})()`));
 const tilt=Math.hypot(.3,3);
 assert.ok(Math.abs(out[0][0]-.3/tilt)<1e-5&&Math.abs(out[0][2]-3/tilt)<1e-5,'gradient adopted');
 assert.deepEqual(out[1],[0,0,1]);
 assert.deepEqual(out[2],[0,0,1]);
 assert.ok(out[3][0]>.2&&out[3][0]<Math.sin(Math.PI/3)-.05,'partial blend');
 for(const n of out)assert.ok(Math.abs(Math.hypot(...n)-1)<1e-5);
});
test('a generated body keeps unit, outward-facing normals that are smoother than triangle averaging',()=>{
 const r=plain(run(`(()=>{
  const seed=3333,style=3,g=makeFounderGenome(seed,style,seed%5);
  g.architectureDNA=normalizedArchitectureDNA(g.architectureDNA,seed,style*8+(g.archetype||0));
  const palette=pickPalette(seed,g.colorDNA,g.patternDNA),em=architectureGrowth(g);
  const keep=fieldGradientNormals;let rough=m=>{const d=m.data;let s=0,e=0;for(let i=0;i<m.edges.length;i+=2){const a=m.edges[i]*9+3,b=m.edges[i+1]*9+3;s+=Math.acos(clamp(d[a]*d[b]+d[a+1]*d[b+1]+d[a+2]*d[b+2],-1,1));e++}return s/e};
  const smooth=morphImplicitMesh(em,palette,g,true);
  fieldGradientNormals=m=>m;const flat=morphImplicitMesh(em,palette,g,true);fieldGradientNormals=keep;
  let unit=true,facing=0;const d=smooth.data,f=flat.data,n=d.length/9;
  for(let i=0;i<n;i++){const o=i*9+3;if(Math.abs(Math.hypot(d[o],d[o+1],d[o+2])-1)>1e-3)unit=false;if(d[o]*f[o]+d[o+1]*f[o+1]+d[o+2]*f[o+2]>0)facing++;}
  let same=true;for(let i=0;i<n;i++)for(let k=0;k<3;k++)if(d[i*9+k]!==f[i*9+k])same=false;
  return {n,unit,facing:facing/n,same,rough:rough(smooth),flat:rough(flat),tri:smooth.tri.length===flat.tri.length};})()`));
 assert.ok(r.n>200&&r.unit&&r.same&&r.tri,'positions and topology are unchanged');
 assert.equal(r.facing,1,'no normal flips relative to the surface');
 assert.ok(r.rough<r.flat,'normal variation across edges '+r.rough+' < '+r.flat);
});
