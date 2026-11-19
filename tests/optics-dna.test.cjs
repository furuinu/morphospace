const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));

test('optical genes are deterministic per DNA, bounded, and differ between individuals',()=>{
 const r=run(`(()=>{const seen=new Set(),spread={};let stable=true,bounded=true;
 for(let i=0;i<64;i++){const g=makeFounderGenome(500000+i*911,i%6,i%5),a=opticsFounderDNA(g.seed,g),b=opticsFounderDNA(g.seed,g);
  if(JSON.stringify(a)!==JSON.stringify(b)||JSON.stringify(a)!==JSON.stringify(g.opticsDNA))stable=false;
  for(const [k,[lo,hi]] of Object.entries(OPTICS_LIMITS)){if(!(a[k]>=lo-1e-6&&a[k]<=hi+1e-6))bounded=false;(spread[k]=spread[k]||new Set()).add(a[k]);}
  seen.add(JSON.stringify(a));}
 return {stable,bounded,unique:seen.size,variety:Object.values(spread).map(s=>s.size)};})()`);
 assert.ok(r.stable&&r.bounded);
 assert.ok(r.unique>55,'individuals must not share one optical look');
 for(const n of plain(r.variety))assert.ok(n>40,'each optical gene must vary across individuals');
});

test('legacy DNA without an optical chromosome is completed deterministically and never rerolled',()=>{
 const r=run(`(()=>{const g=makeFounderGenome(731029,2,1);delete g.opticsDNA;
 const first=copyJSON(ensureOpticsDNA(g,731029)),second=copyJSON(ensureOpticsDNA(g,731029));
 const other={...copyJSON(makeFounderGenome(731029,2,1)),opticsDNA:undefined};delete other.opticsDNA;
 return {same:JSON.stringify(first)===JSON.stringify(second),fresh:JSON.stringify(ensureOpticsDNA(other,731029))===JSON.stringify(first)};})()`);
 assert.deepEqual(plain(r),{same:true,fresh:true});
});

test('optical genes segregate, mutate and stay bounded over generations without touching parents',()=>{
 const r=run(`(()=>{let a=makeFounderGenome(118821,0,2),b=makeFounderGenome(994113,3,4),mutations=0,sources=new Set(),bounded=true,blockSplit=0;
 for(let gen=0;gen<40;gen++){const before=JSON.stringify([a,b]),kid=crossoverGenome(a,b,33000+gen*271,2,.75);
  if(before!==JSON.stringify([a,b]))throw Error('parent DNA changed');
  for(const [k,[lo,hi]] of Object.entries(OPTICS_LIMITS)){const v=kid.genome.opticsDNA[k];if(!(v>=lo-1e-6&&v<=hi+1e-6))bounded=false;}
  sources.add(kid.inherited.optics_reflect);sources.add(kid.inherited.optics_spectral);
  if(kid.inherited.optics_reflect!==kid.inherited.optics_spectral)blockSplit++;
  mutations+=kid.mutationLog.filter(x=>x.field.startsWith('opticsDNA.')).length;
  b=a;a=kid.genome;}
 return {bounded,mutations,sources:[...sources].sort(),blockSplit};})()`);
 assert.ok(r.bounded);
 assert.ok(r.mutations>8,'mutation must reach the optical chromosome');
 assert.deepEqual(plain(r.sources),['A','B']);
 assert.ok(r.blockSplit>5,'reflection and spectral blocks must be able to come from different parents');
});

test('share links carry the optical chromosome and old links without it still decode',()=>{
 const r=run(`(()=>{const g=makeFounderGenome(640211,1,3);
 const record={version:1,record:{id:'optics-test',name:'光学標本',seed:g.seed,style:g.style,genome:copyJSON(g),generation:1,parents:[]},view:{}};
 const round=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(record));
 const legacy=copyJSON(record);delete legacy.record.genome.opticsDNA;
 const legacyRound=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(legacy));
 return {kept:JSON.stringify(round.record.genome.opticsDNA)===JSON.stringify(g.opticsDNA),
  legacyOk:!legacyRound.record.genome.opticsDNA&&legacyRound.record.seed===g.seed,
  completed:JSON.stringify(ensureOpticsDNA(legacyRound.record.genome,640211))===JSON.stringify(ensureOpticsDNA(copyJSON(legacyRound.record.genome),640211))};})()`);
 assert.deepEqual(plain(r),{kept:true,legacyOk:true,completed:true});
});

test('the inspector no longer stores optical genes as shared viewing settings',()=>{
 for(const id of ['fresnelStrength','iridescenceStrength','thinFilmStrength','glossStrength']){
  assert.ok(!new RegExp("'"+id+"'\\s*[,\\]]").test(html.slice(html.indexOf("const out={};for(const id of ["),html.indexOf("const out={};for(const id of [")+900)),id+' must not be a view setting');
 }
 assert.ok(/id="opticsToDNA"/.test(html),'a reset-to-DNA control must exist');
});
