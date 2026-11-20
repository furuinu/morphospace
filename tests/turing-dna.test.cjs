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

// Shared helpers for the normalisation tests.
const pigmentArea=(atlas,stage)=>{
 const n=reaction.size,size=n*2,tx=(stage%2)*n,ty=Math.floor(stage/2)*n;
 const ss=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 let sum=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++)sum+=ss(.30,.46,atlas.pixels[((ty+y)*size+tx+x)*4]/255);
 return sum/(n*n);
};

test('every individual carries a visible marking at its inherited coverage',()=>{
 const genes=plain(run(`(()=>{const o=[];for(let i=0;i<64;i++){const g=makeFounderGenome(600000+i*733,i%8,i%5);o.push({seed:g.seed,p:copyJSON(g.patternDNA),t:copyJSON(g.turingDNA)});}return o;})()`));
 let blank=0,worst=0;
 for(const g of genes){
  const area=pigmentArea(reaction.createAtlas(g.seed,g.p,g.t),3);
  if(area<.02)blank++;
  worst=Math.max(worst,Math.abs(area-g.t.coverTarget));
 }
 // Before normalisation 5 of these 64 rendered nothing and the area ran 0% to 81%.
 assert.equal(blank,0,`${blank} individuals rendered no marking`);
 assert.ok(worst<.03,`coverage missed its target by ${(worst*100).toFixed(1)} points`);
});

test('normalisation keeps the four stages growing and the domains sharp',()=>{
 const g=plain(run(`(()=>{const g=makeFounderGenome(707171,3,2);return {seed:g.seed,p:copyJSON(g.patternDNA),t:{...copyJSON(g.turingDNA),coverTarget:.45}};})()`));
 const atlas=reaction.createAtlas(g.seed,g.p,g.t);
 const areas=[0,1,2,3].map(i=>pigmentArea(atlas,i));
 for(let i=1;i<4;i++)assert.ok(areas[i]>=areas[i-1]-.02,`stage ${i} must not shrink: ${areas.map(a=>(a*100).toFixed(0)).join('<')}`);
 assert.ok(areas[3]>areas[0]+.05,'the marking must visibly grow across the stages');
 // A soft ramp would put most of the field in the transition band and read as a wash.
 const n=reaction.size,size=n*2,ty=n;let band=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=atlas.pixels[((ty+y)*size+n+x)*4]/255;if(Math.abs(v-.47)<.25)band++;}
 assert.ok(band/(n*n)<.25,`the transition band must stay narrow, got ${(band/(n*n)*100).toFixed(0)}%`);
});

test('the coverage target is inherited and mutates with the display block',()=>{
 const r=run(`(()=>{let a=makeFounderGenome(818111,1,2),b=makeFounderGenome(252521,7,0),mutations=0;const seen=new Set();
 for(let gen=0;gen<40;gen++){const kid=crossoverGenome(a,b,91000+gen*523,2,.7);
  const v=kid.genome.turingDNA.coverTarget;
  if(!(v>=.10-1e-6&&v<=.62+1e-6))throw Error('coverTarget out of range: '+v);
  seen.add(v.toFixed(4));
  mutations+=kid.mutationLog.filter(x=>x.field==='turingDNA.coverTarget').length;
  b=a;a=kid.genome;}
 return {mutations,unique:seen.size};})()`);
 assert.ok(plain(r).mutations>2,'the coverage target must be able to mutate');
 assert.ok(plain(r).unique>12,'offspring must not all share one coverage');
});

test('the second Turing scale adds finer structure at the same coverage',()=>{
 const g=plain(run(`(()=>{const g=makeFounderGenome(707171,3,2);return {seed:g.seed,p:copyJSON(g.patternDNA),t:copyJSON(g.turingDNA)};})()`));
 const base={...g.t,coverTarget:.35,anisotropy:0,fineInside:.8};
 const n=reaction.size;
 const read=t=>{const a=reaction.createAtlas(g.seed,g.p,t),sz=n*2,f=new Float64Array(n*n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)f[y*n+x]=a.pixels[((n+y)*sz+n+x)*4]/255;return f;};
 const detail=f=>{let s=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=f[y*n+x];
  s+=(v-f[y*n+(x+1)%n])**2+(v-f[((y+1)%n)*n+x])**2;}return s/(n*n);};
 const area=f=>{let c=0;for(const v of f)if(v>.38)c++;return c/(n*n);};
 const blobs=f=>{const seen=new Uint8Array(n*n);let c=0;
  for(let i=0;i<n*n;i++){if(seen[i]||f[i]<=.38)continue;c++;const st=[i];seen[i]=1;
   while(st.length){const j=st.pop(),x=j%n,y=(j-x)/n;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=(x+dx+n)%n,ny=(y+dy+n)%n,k=ny*n+nx;
     if(!seen[k]&&f[k]>.38){seen[k]=1;st.push(k);}}}}
  return c;};
 const single=read({...base,fineWeight:0});
 const twoScale=read({...base,fineWeight:1,scaleRatio:2.5});
 const wide=read({...base,fineWeight:1,scaleRatio:4});
 const inverted=read({...base,fineWeight:-1,scaleRatio:2.5});
 assert.ok(detail(twoScale)>detail(single)*1.2,'the fine mode must add high-frequency structure');
 assert.ok(blobs(wide)>blobs(single)*2,'a wide scale ratio must break the marking into finer domains');
 assert.notDeepEqual([...inverted],[...twoScale],'a negative weight must invert the fine mode');
 // Requantisation runs after the two modes are combined, so coverage is unaffected.
 for(const f of [twoScale,wide,inverted])assert.ok(Math.abs(area(f)-area(single))<.05,'coverage must hold across scale settings');
});

test('scale genes vary, segregate, and leave some individuals single-scale',()=>{
 const r=run(`(()=>{const o=[];for(let i=0;i<64;i++)o.push(copyJSON(makeFounderGenome(600000+i*733,i%8,i%5)));
 let a=o[0],b=o[9],split=0,mutations=0;
 for(let gen=0;gen<40;gen++){const kid=crossoverGenome(a,b,101000+gen*613,2,.7);
  const t=kid.genome.turingDNA;
  if(!(t.scaleRatio>=1.6-1e-6&&t.scaleRatio<=4.2+1e-6&&t.fineWeight>=-1-1e-6&&t.fineWeight<=1+1e-6))throw Error('scale genes out of range');
  if(kid.inherited.turing_scale!==kid.inherited.turing_chemistry)split++;
  mutations+=kid.mutationLog.filter(x=>/turingDNA\.(scaleRatio|fineWeight|fineInside)/.test(x.field)).length;
  b=a;a=kid.genome;}
 const dnas=o.map(g=>g.turingDNA);
 return {single:dnas.filter(d=>d.fineWeight===0).length,negative:dnas.filter(d=>d.fineWeight<0).length,split,mutations};})()`);
 const v=plain(r);
 // A second scale everywhere would be as monotonous as none: both must occur.
 assert.ok(v.single>5&&v.single<40,`single-scale individuals must be a real minority: ${v.single}/64`);
 assert.ok(v.negative>4,`inverted fine detail must occur: ${v.negative}/64`);
 assert.ok(v.split>5&&v.mutations>5,'the scale block must segregate and mutate independently');
});

// The Worker runs the same module from the same inlined source, so its atlas must be
// byte-identical to a main-thread bake. This builds the Worker's script exactly as the
// page does and runs it against a stub `self`.
test('the Worker bake is byte-identical to a main-thread bake',()=>{
 const node=/<script data-bundled="surface-reaction\.js">([\s\S]*?)<\/script>/.exec(html);
 assert.ok(node,'the inlined reaction module must be findable by the selector the page uses');
 assert.match(html,/document\.querySelector\('script\[data-bundled="surface-reaction\.js"\]'\)/,'the page must read that same script tag');
 const source='const window=self;const document={querySelectorAll:()=>[],getElementById:()=>({value:100})};\n'+node[1]+
  '\nself.onmessage=event=>{const job=event.data;try{'+
  'const atlas=self.MorphospaceReaction.createAtlas(job.seed,job.pattern,job.turing);'+
  'self.postMessage({id:job.id,key:job.key,ok:true,width:atlas.width,height:atlas.height,pixels:atlas.pixels},[atlas.pixels.buffer]);'+
  '}catch(error){self.postMessage({id:job.id,key:job.key,ok:false,message:error&&error.message||String(error)})}};';
 let sent=null;
 const self_={postMessage:m=>{sent=m},Float32Array,Uint8Array,Math,JSON,String,Number,Object,Error,isNaN,parseFloat};
 self_.self=self_;
 vm.createContext(self_);
 vm.runInContext(source,self_);
 assert.ok(self_.MorphospaceReaction,'the module must attach itself inside a Worker');
 const g=plain(run(`(()=>{const g=makeFounderGenome(515151,6,3);return {seed:g.seed,p:copyJSON(g.patternDNA),t:copyJSON(g.turingDNA)};})()`));
 self_.onmessage({data:{id:1,key:'k',seed:g.seed,pattern:g.p,turing:g.t}});
 assert.ok(sent&&sent.ok,'the Worker must answer with an atlas: '+(sent&&sent.message));
 const direct=reaction.createAtlas(g.seed,g.p,g.t);
 assert.equal(sent.width,direct.width);
 assert.deepEqual([...sent.pixels],[...direct.pixels],'moving the bake off-thread must not change a single byte');
});

test('a pending bake defers the draw instead of blocking it, and the thumbnail retries once',()=>{
 // reactionTextureFor must return null while a bake is queued, never run the
 // simulation inline, and must not enqueue the same atlas twice.
 const fn=html.slice(html.indexOf('function reactionTextureFor('),html.indexOf('function applyReactionUniforms('));
 assert.match(fn,/if\(reactionPending\.has\(key\)\)\{reactionDeferred=true;return null\}/,'a second request for a baking atlas must not re-queue it');
 assert.match(fn,/reactionPending\.add\(key\);reactionDeferred=true;/);
 assert.match(fn,/reactionQueue\.push\(\{id:\+\+reactionJobSeq,key,seed:palette\.seed,pattern:d,turing:t\}\)/);
 // The synchronous bake must survive only as the no-Worker fallback.
 const sync=fn.match(/MorphospaceReaction\.createAtlas/g)||[];
 assert.equal(sync.length,1,'the inline bake must remain only as the fallback');
 assert.ok(fn.indexOf('if(reactionWorkerPool())')<fn.lastIndexOf('MorphospaceReaction.createAtlas'),'the fallback must come after the Worker path');
 const queue=html.slice(html.indexOf('function queueAtlasPreview('),html.indexOf('function drawGpuPreview('));
 assert.match(queue,/if\(!reactionDeferred\|\|job\.retried\|\|job\.epoch!==atlasEpoch\)return;/,'a thumbnail must retry only when a bake was deferred');
 assert.match(queue,/onReactionIdle\(\(\)=>\{if\(job\.epoch===atlasEpoch\)\{job\.queued=false;enqueue\(\)\}\}\)/);
 // A stale generation must not redraw into a recycled canvas.
 assert.match(queue,/job\.epoch!==atlasEpoch/);
 assert.match(html,/while\(reactionGPUCache\.size>16\)/,'the cache must outlive the retry and hold both sides of a morph');
 // Specimens are generated one at a time, so two workers cover the open specimen and
 // the one being morphed to; more would just be idle threads.
 assert.match(html,/for\(let i=0;i<Math\.min\(2,Math\.max\(1,cores-1\)\);i\+\+\)/);
 assert.match(html,/const nextReady=target===palette\|\|!!other;/,'a baking target must not borrow the open atlas');
 assert.match(html,/uNextTuring0,nextReady\?genes\(target\):new Float32Array\(4\)/,'an unbaked target must contribute no marking');
 // The redraw is for the open specimen only: during a gallery build the main canvas
 // holds nothing, and each thumbnail comes back through the preview queue instead.
 assert.match(html,/if\(spec&&meshes&&!animating\)\{try\{render\(\)\}catch\(error\)\{\}\}/);
});

test('new specimens simulate on the finer grid while legacy bakes keep the old one',()=>{
 assert.equal(reaction.legacySize,56,'the historical grid must stay available for legacy bakes');
 assert.equal(reaction.size,112,'new specimens must simulate on the finer grid');
 const g=plain(run(`(()=>{const g=copyJSON(makeFounderGenome(733117,5,3));const legacy=copyJSON(g);delete legacy.turingDNA;
 return {seed:g.seed,p:copyJSON(g.patternDNA),t:copyJSON(g.turingDNA),l:copyJSON(ensureTuringDNA(legacy,legacy.seed))};})()`));
 assert.equal(reaction.createAtlas(g.seed,g.p,g.l).width,112,'a legacy atlas stays 2x56');
 assert.equal(reaction.createAtlas(g.seed,g.p,g.t).width,224,'a new atlas is 2x112');
 // The neighbour offset scales with the grid, so diffusion length - and therefore the
 // pattern's size relative to the body - is unchanged. Without this the finer grid
 // would simply halve every marking rather than resolve it.
 assert.match(html,/const n=legacy\?LEGACY_N:N,len=n\*n,step=legacy\?1:Math\.round\(N\/LEGACY_N\);/);
 assert.match(html,/const s1=step,s2=step;/);
 assert.match(html,/a\[ix\(x\+s1,y\)\]\+a\[ix\(x-s1,y\)\]/,'the stencil must use the scaled offset');
 assert.match(html,/r:spotRadius\(rng\)\*step/,'seeding must scale with the grid too');
});
