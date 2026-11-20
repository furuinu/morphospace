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

test('the reaction layer lays down palette colour and legacy specimens stay a pure darkening',()=>{
 const start=html.indexOf('vec3 reactionCoating('),body=html.slice(start,html.indexOf('vec3 n=normalize(vNormal);',start));
 assert.match(body,/vec3 ink=mix\(mix\(accent,highlight,tint\.x\),deep,tint\.y\*\.75\);/,'pigment colour must come from the palette');
 assert.match(body,/color=mix\(color,ink\*/,'the marking must be laid as colour, not only as shade');
 assert.match(body,/color\*=1\.-lay\*1\.35\*\(1\.-tint\.z\*\.72\);/,'tint.z=0 must reduce to the historical darkening');
 // The rim must come from the transition band, not from `edge`, which is its complement
 // and covers most of the surface: using `edge` tinted the whole body instead.
 assert.match(body,/float boundary=1\.-smoothstep\(\.04,\.17,abs\(chem\.r-\.47\)\);/,'the rim must use the boundary band');
 assert.match(body,/clamp\(boundary\*coverage\*tint\.w\*1\.6,0\.,\.55\)/,'the rim must stay bounded');
 assert.doesNotMatch(body,/mix\(color,highlight,clamp\(edge\*/,'the rim must not be driven by the complement band');
 assert.match(html,/reactionCoating\(color,point,chromaticPoint\(point\),uReactionAtlas,uPal1,uPal4,uPal2,/);
 assert.match(html,/uNextReactionAtlas,uNextPal1,uNextPal4,uNextPal2,/,'morphing must carry the target palette too');
 const r=run(`(()=>{const g=makeFounderGenome(880017,4,2);const legacy=copyJSON(g);delete legacy.turingDNA;
 return {founderTints:copyJSON(g.turingDNA),legacyTint:ensureTuringDNA(legacy,legacy.seed).tintDepth};})()`);
 assert.equal(plain(r.legacyTint),0,'legacy specimens must not be recoloured');
 for(const k of ['inkColor','deepMix','tintDepth','edgeWeight'])assert.ok(Number.isFinite(plain(r.founderTints)[k]),k+' must be generated');
});

test('colour genes vary across individuals and are inherited as their own block',()=>{
 const r=run(`(()=>{const tints=new Set(),depths=[];
 for(let i=0;i<48;i++){const g=makeFounderGenome(330000+i*751,i%8,i%5),t=g.turingDNA;
  tints.add([t.inkColor,t.deepMix,t.tintDepth,t.edgeWeight].join(','));depths.push(t.tintDepth);}
 let a=makeFounderGenome(441003,2,1),b=makeFounderGenome(118827,6,3),split=0,mutations=0;
 for(let gen=0;gen<40;gen++){const kid=crossoverGenome(a,b,61000+gen*419,2,.7);
  if(kid.inherited.turing_ink!==kid.inherited.turing_chemistry)split++;
  mutations+=kid.mutationLog.filter(x=>x.field.startsWith('turingDNA.')&&/inkColor|deepMix|tintDepth|edgeWeight/.test(x.field)).length;
  b=a;a=kid.genome;}
 return {unique:tints.size,strong:depths.filter(d=>d>.6).length,faint:depths.filter(d=>d<.4).length,split,mutations};})()`);
 const v=plain(r);
 assert.ok(v.unique>=46,'colour genes must differ between individuals');
 assert.ok(v.strong>6&&v.faint>6,`both strongly and faintly tinted individuals must occur: ${v.strong}/${v.faint}`);
 assert.ok(v.split>5&&v.mutations>5,'the ink block must segregate and mutate independently');
});
