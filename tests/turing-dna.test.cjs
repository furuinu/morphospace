const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const reaction=(()=>{const src=scripts.find(s=>s.includes('MORPHOSPACE reaction-diffusion'));const box={module:{exports:{}}};box.window=box;vm.createContext(box);vm.runInContext(src,box);return box.MorphospaceReaction;})();

// The field must actually pattern: a Gray-Scott run outside the Turing-unstable
// band decays to a flat sheet, which would silently remove the markings.
const structure=field=>{
 let min=1,max=0,mean=0;for(const v of field){min=Math.min(min,v);max=Math.max(max,v);mean+=v;}
 mean/=field.length;let variance=0;for(const v of field)variance+=(v-mean)**2;
 return {range:max-min,sd:Math.sqrt(variance/field.length)};
};
const stageField=(atlas,stage)=>{
 const n=reaction.size,size=n*2,tx=(stage%2)*n,ty=Math.floor(stage/2)*n,out=new Float64Array(n*n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)out[y*n+x]=atlas.pixels[((ty+y)*size+tx+x)*4]/255;
 return out;
};

test('every founder reaction chromosome lands in a patterning regime',()=>{
 const genes=run(`(()=>{const out=[];for(let i=0;i<40;i++){const g=makeFounderGenome(220000+i*613,i%8,i%5);out.push({seed:g.seed,dna:copyJSON(g.turingDNA),pattern:copyJSON(g.patternDNA)});}return out;})()`);
 let patterned=0,oriented=0;
 for(const {seed,dna,pattern} of plain(genes)){
  const atlas=reaction.createAtlas(seed,pattern,dna),s=structure(stageField(atlas,3));
  if(s.sd>.04&&s.range>.30)patterned++;
  if(dna.anisotropy>.12)oriented++;
 }
 assert.ok(patterned>=36,`only ${patterned}/40 individuals produced a pattern`);
 assert.ok(oriented>=6&&oriented<=26,`oriented individuals should be a minority but not rare: ${oriented}`);
});

test('the same chromosome always yields the same atlas, and a changed gene changes it',()=>{
 const g=run(`copyJSON(makeFounderGenome(448127,3,2))`),dna=plain(g.turingDNA),pattern=plain(g.patternDNA);
 const a=reaction.createAtlas(g.seed,pattern,dna),b=reaction.createAtlas(g.seed,pattern,dna);
 assert.deepEqual([...a.pixels],[...b.pixels],'identical DNA must redraw identically');
 const shifted=reaction.createAtlas(g.seed,pattern,{...dna,feed:dna.feed+.006});
 assert.notDeepEqual([...shifted.pixels],[...a.pixels],'chemistry genes must reach the simulation');
 const turned=reaction.createAtlas(g.seed,pattern,{...dna,anisotropy:.5,axis:0});
 const across=reaction.createAtlas(g.seed,pattern,{...dna,anisotropy:.5,axis:Math.PI/2});
 assert.notDeepEqual([...turned.pixels],[...across.pixels],'the orientation axis must change the pattern');
});

test('anisotropic diffusion orients the pattern along its axis',()=>{
 const g=run(`copyJSON(makeFounderGenome(512903,1,0))`),pattern=plain(g.patternDNA);
 const base={...plain(g.turingDNA),feed:.037,kill:.060,diffusionA:.96,diffusionB:.48,expression:1,seedSpots:14,seedRadius:2.6};
 const n=reaction.size,contrast=(field,horizontal)=>{
  let sum=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const here=field[y*n+x],next=horizontal?field[y*n+((x+1)%n)]:field[((y+1)%n)*n+x];
   sum+=(here-next)**2;}
  return sum/(n*n);
 };
 const along=stageField(reaction.createAtlas(g.seed,pattern,{...base,anisotropy:.5,axis:0}),3);
 const iso=stageField(reaction.createAtlas(g.seed,pattern,{...base,anisotropy:0,axis:0}),3);
 const ratio=f=>contrast(f,true)/Math.max(1e-9,contrast(f,false));
 assert.ok(structure(along).sd>.04,'the oriented run must still pattern');
 // Faster diffusion along x smooths x and leaves the variation across y.
 assert.ok(ratio(along)<ratio(iso)*0.9,`anisotropy did not bias direction (${ratio(along).toFixed(3)} vs ${ratio(iso).toFixed(3)})`);
});

test('legacy specimens keep their exact historical appearance',()=>{
 const g=run(`(()=>{const g=copyJSON(makeFounderGenome(733117,5,3));delete g.turingDNA;return {seed:g.seed,pattern:copyJSON(g.patternDNA),legacy:copyJSON(ensureTuringDNA(g,g.seed)),again:copyJSON(ensureTuringDNA(copyJSON(g),g.seed))};})()`);
 const r=plain(g);
 assert.equal(r.legacy.legacy,1,'a specimen without the chromosome must be completed as legacy');
 assert.deepEqual(r.again,r.legacy,'legacy completion must be deterministic');
 assert.equal(r.legacy.expression,0,'legacy specimens keep the old faint coverage');
 const now=reaction.createAtlas(r.seed,r.pattern,r.legacy),before=reaction.createAtlas(r.seed,r.pattern,null);
 assert.deepEqual([...now.pixels],[...before.pixels],'the legacy path must be pixel-identical to the pre-change simulation');
});

test('reaction genes segregate and mutate without touching the parents',()=>{
 const r=run(`(()=>{let a=makeFounderGenome(301117,2,1),b=makeFounderGenome(880231,6,4),mutations=0,split=0,bounded=true;
 for(let gen=0;gen<40;gen++){const before=JSON.stringify([a,b]),kid=crossoverGenome(a,b,51000+gen*337,3,.7);
  if(before!==JSON.stringify([a,b]))throw Error('parent DNA changed');
  for(const [k,[lo,hi]] of Object.entries(TURING_LIMITS)){const v=kid.genome.turingDNA[k];if(!(v>=lo-1e-6&&v<=hi+1e-6))bounded=false;}
  if(kid.inherited.turing_chemistry!==kid.inherited.turing_orientation)split++;
  mutations+=kid.mutationLog.filter(x=>x.field.startsWith('turingDNA.')).length;
  b=a;a=kid.genome;}
 return {bounded,mutations,split};})()`);
 assert.ok(r.bounded);
 assert.ok(r.mutations>8,'mutation must reach the reaction chromosome');
 assert.ok(r.split>5,'chemistry and orientation must be able to come from different parents');
});

test('share links carry the reaction chromosome and old links still decode', ()=>{
 const r=run(`(()=>{const g=makeFounderGenome(640999,4,2);
 const record={version:1,record:{id:'turing-test',name:'反応標本',seed:g.seed,style:g.style,genome:copyJSON(g),generation:1,parents:[]},view:{}};
 const round=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(record));
 const legacy=copyJSON(record);delete legacy.record.genome.turingDNA;
 const old=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(legacy));
 return {kept:JSON.stringify(round.record.genome.turingDNA)===JSON.stringify(g.turingDNA),
  legacyOk:!old.record.genome.turingDNA&&old.record.seed===g.seed};})()`);
 assert.deepEqual(plain(r),{kept:true,legacyOk:true});
});

test('a legacy parent passes on expressible reaction genes to its offspring',()=>{
 const r=run(`(()=>{const a=makeFounderGenome(191731,2,1),b=makeFounderGenome(640211,5,3);
 delete a.turingDNA;delete b.turingDNA;ensureTuringDNA(a,a.seed);ensureTuringDNA(b,b.seed);
 const kid=crossoverGenome(a,b,77001,3,.6).genome.turingDNA;
 return {parentsStayFaint:a.turingDNA.expression===0&&b.turingDNA.expression===0,
  kidCanExpress:!kid.legacy&&kid.seedSpots>=6&&kid.expression>0,
  kidChemistryFromParents:[a.turingDNA.feed,b.turingDNA.feed].some(f=>Math.abs(f-kid.feed)<.02)};})()`);
 assert.deepEqual(plain(r),{parentsStayFaint:true,kidCanExpress:true,kidChemistryFromParents:true});
});
