const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2],core=src.slice(0,src.indexOf("const canvas=$('glview'),gl="));
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(core,ctx);
function mesh(vertices,tri){const data=new Float32Array(vertices.length*17);vertices.forEach((p,i)=>data.set([...p,0,0,1,1,0,0,0,0,0,0,0,0,0,0],i*17));return{data,tri:new Uint16Array(tri),edges:new Uint16Array(tri.flatMap((v,i)=>[v,tri[i-i%3+(i+1)%3]]))}}
const a=mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]),b=mesh([[0,0,1],[2,0,1],[0,2,1],[-2,0,1]],[0,1,2,0,2,3]);
test('morph preserves every triangle of unequal topology at both endpoints with safe WebGL1 indices',()=>{
 const result=ctx.createMorphBatches([a],[b],1);assert.equal(result.length,3);
 const sourceBefore=Array.from(a.data),targetBefore=Array.from(b.data);
 for(const batch of result){
  assert.ok(Math.max(...batch.tri)<65536);
  for(const t of [0,.02,.1,.5,.9,.98,1]){
   ctx.interpolateMorphBatch(batch,t);
   assert.ok(Array.from(batch.data).every(Number.isFinite));
   for(let i=0;i<batch.data.length;i++)if(i%17>=3){const expected=i%17>=9?(batch.side==='incoming'?batch.end[i]:batch.start[i]):batch.start[i]+(batch.end[i]-batch.start[i])*t;assert.ok(Math.abs(batch.data[i]-expected)<1e-5);}
  }
  ctx.interpolateMorphBatch(batch,batch.side==='incoming'?1:0);
  const native=batch.side==='incoming'?batch.end:batch.start;
  for(let i=0;i<batch.data.length;i++)assert.ok(Math.abs(batch.data[i]-native[i])<1e-5);
  ctx.interpolateMorphBatch(batch,batch.side==='incoming'?0:1);
  // Non-native endpoint must stay in anatomical space instead of collapsing
  // every vertex to the origin (the previous implementation's visual defect).
  const mapped=batch.side==='incoming'?batch.start:batch.end;
  for(let i=0;i<batch.data.length;i++)if(i%17<3)assert.ok(Math.abs(batch.data[i]-mapped[i])<1e-5);
  assert.ok(Array.from(batch.data).some((v,i)=>i%17<3&&Math.abs(v)>1e-4));
 }
 const faces=result.slice(1).map(x=>Array.from(x.end).filter((_,i)=>i%17<3).join(','));assert.equal(new Set(faces).size,2);
 assert.deepEqual(Array.from(a.data),sourceBefore);assert.deepEqual(Array.from(b.data),targetBefore);
});
test('real seeded organisms create finite intermediate geometry without changing their DNA',()=>{
 const r=vm.runInContext(`(()=>{const make=seed=>{const p=pickPalette(seed),sp=makeSpecimen(seed,0,p,true,null,.75,.84,.75,0);return {sp,surfaces:[dynamicMesh(sp.shell,0,0,[0,0,0]),...dynamicBatches(sp).map(p=>p.mesh)]}};const a=make(731029),b=make(571938),dna=JSON.stringify([a.sp.genome,b.sp.genome]),m=createMorphBatches(a.surfaces,b.surfaces);for(const batch of m)interpolateMorphBatch(batch,.5);return {finite:m.every(b=>Array.from(b.data).every(Number.isFinite)),triangles:m.reduce((n,b)=>n+b.tri.length/3,0),sameDNA:dna===JSON.stringify([a.sp.genome,b.sp.genome])}})()`,ctx);
 assert.ok(r.finite);assert.ok(r.triangles>100);assert.ok(r.sameDNA);
});
function runtime(){
 const elements={},events=[],workers=[],transfers=[],defaults={variance:75,density:84,micro:75,emitColor:0,emissionStrength:110,emitBlink:1,blinkSpeed:65,bloomRadius:105};let bufferId=0;
 const f={console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),TAU:Math.PI*2,performance:{now:()=>100},document:{hidden:false,createElement:()=>({className:'',hidden:false,setAttribute(){},getContext:()=>null})},spec:{seed:1,style:0,baseViewDistance:10,viewDistance:20},selected:0,activeStoredIndividual:null,busy:false,videoRecording:null,nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,population:[{id:'a',seed:1,genome:{}},{id:'b',seed:2,genome:{}}],meshes:{id:'original',shell:{...a,buffer:'old',triBuffer:'old-tri',lineBuffer:'old-lines'},parts:[],cilia:[]},rigMeshes:[],detailSpecimens:[],detailCacheOrder:[],
  VIEWER_CORE_SOURCE:core,viewerWorkerSource:ctx.viewerWorkerSource,viewerMorphSurfaces:ctx.viewerMorphSurfaces,textureMorphUniforms:ctx.textureMorphUniforms,renderer:{vars:{}},buildEmissionSites:()=>Array.from({length:4},()=>[0,0,0,.3]),getSpecEmissionDNA:()=>({colorMode:0,strength:110,blinkMode:1,blinkSpeed:65,bloomRadius:105}),EMIT_COLORS:[[.2,.8,1]],
  Blob:class{},URL:{createObjectURL:()=> 'blob:worker'},Worker:class{constructor(){workers.push(this)}postMessage(value){this.request=value}terminate(){this.terminated=true}},
  gl:{ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,STATIC_DRAW:3,DYNAMIC_DRAW:4,createBuffer:()=> 'new-'+(++bufferId),bindBuffer(){},bufferData(target,size){events.push('allocate');transfers.push({allocate:size})},bufferSubData(target,offset,data){events.push('upload');transfers.push({bytes:data.byteLength})},deleteBuffer:buffer=>events.push('delete:'+buffer)},
  applyUploadedSpecimen:(sp,preserve,metadata,prepared)=>{assert.ok(prepared);f.spec=sp;f.meshes=prepared.meshes;events.push('apply')},currentIndividual:()=>({name:'original'}),recordDisplayName:r=>r.name,viewerMetadata:()=>events.push('metadata'),viewerPatternValues:()=>new Map(),morphFrameFactors:ctx.morphFrameFactors,interpolateMorphBatch:ctx.interpolateMorphBatch,
  $:id=>elements[id]||(elements[id]={open:false,value:String(defaults[id]??0),textContent:'',checked:true,hidden:false,style:{},classList:{toggle(){},add(){},remove(){},contains(){return true}},setAttribute(k,v){this[k]=v}})};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const viewer='),src.indexOf("$('viewerFullscreen').onclick=")),f);f.viewerMetadata=()=>events.push('metadata');f.viewerPatternValues=()=>new Map();f.v=vm.runInContext('viewer',f);return{f,events,workers,transfers};
}
function deliver(f,worker,target={seed:2,style:0,genome:{},parts:[],rigs:[],palette:{}},batches=ctx.createMorphBatches([a],[b])){
 worker.onmessage({data:{ok:true,payload:{target,distance:15,targetMeshes:{shell:b,parts:[],cilia:[]},batches}}});return target;
}
function stored(id,seed){return{id,payload:{record:{id,seed,name:id,genome:{}}}}}
test('captured-only playback adopts saved identities without changing the gallery or its mesh cache',()=>{
 const {f,workers}=runtime(),first=stored('saved-a',101),second=stored('saved-b',102);f.stockEntries=[first,second];f.activeStoredIndividual=first;f.v.source='stock';
 const population=JSON.stringify(f.population),cached={gallery:true};f.detailSpecimens[0]=cached;
 f.startViewerMorph();assert.equal(workers[0].request.record.seed,102);deliver(f,workers[0],{seed:102,style:0,genome:{},parts:[],rigs:[],palette:{}});
 f.advanceViewerPreparation();f.activateViewerPreparation();for(let i=0;i<14;i++)f.tickViewer(.12);assert.equal(f.v.morph,null);assert.ok(f.v.phaseFade);
 assert.equal(f.activeStoredIndividual,second);assert.equal(f.spec.seed,102);assert.equal(f.detailSpecimens[0],cached);assert.equal(JSON.stringify(f.population),population);assert.equal(f.v.source,'stock');
 f.queueViewerPreparation();assert.equal(workers[1].request.record.seed,101);
});
test('random next excludes the current organism and holds one choice throughout preloading in either collection',()=>{
 for(const source of ['gallery','stock']){
  const {f,workers}=runtime();f.population.push({id:'c',seed:3,genome:{}});f.stockEntries=[stored('x',101),stored('y',102),stored('z',103)];f.v.source=source;f.v.random=true;
  if(source==='stock')f.activeStoredIndividual=f.stockEntries[0];
  vm.runInContext('Math.random=()=>.99',f);f.queueViewerPreparation();const chosen=workers[0].request.record.seed;assert.equal(chosen,source==='stock'?103:3);
  for(let i=0;i<30;i++)f.queueViewerPreparation();assert.equal(workers.length,1);assert.equal(workers[0].terminated,undefined);
  f.startViewerMorph(-1);assert.equal(workers[0].terminated,true);assert.equal(workers[1].request.record.seed,source==='stock'?103:3);
 }
});
test('a single capture can be entered from the gallery but never morphs back into the gallery',()=>{
 const {f,workers}=runtime();f.stockEntries=[stored('only',101)];f.v.source='stock';f.startViewerMorph();assert.equal(workers[0].request.record.seed,101);
 deliver(f,workers[0],{seed:101,style:0,genome:{},parts:[],rigs:[],palette:{}});f.advanceViewerPreparation();f.activateViewerPreparation();for(let i=0;i<14;i++)f.tickViewer(.12);assert.equal(f.v.morph,null);assert.ok(f.v.phaseFade);
 f.startViewerMorph();f.queueViewerPreparation();assert.equal(workers.length,1);assert.equal(f.v.preparing,false);assert.equal(f.activeStoredIndividual,f.stockEntries[0]);
});
test('captured-only selection reports an empty archive and ignores a load superseded by closing',async()=>{
 const {f,workers}=runtime();f.stockEntries=[];f.refreshStock=async()=>{};await f.setViewerSource('stock');assert.equal(f.v.source,'gallery');assert.match(f.$('viewerTransition').textContent,/キャプチャーした生体がありません/);assert.equal(workers.length,0);
 let release;f.refreshStock=()=>new Promise(resolve=>release=resolve);const pending=f.setViewerSource('stock');f.stopViewer();f.stockEntries=[stored('late',101)];release();await pending;assert.equal(f.v.source,'gallery');assert.equal(workers.length,0);
});
test('changing playback source cancels old preparation before preparing the new collection',async()=>{
 const {f,workers}=runtime();f.queueViewerPreparation();const old=workers[0];f.stockEntries=[stored('only',101)];f.refreshStock=async()=>{};await f.setViewerSource('stock');assert.equal(old.terminated,true);assert.equal(workers[1].request.record.seed,101);assert.equal(f.v.source,'stock');deliver(f,old);assert.equal(f.v.pending.target,undefined);
});
test('closing terminates the worker and rejects a late result without touching the live specimen',()=>{
 const {f,workers}=runtime(),original=f.meshes;f.startViewerMorph();assert.equal(f.v.preparing,true);const worker=workers[0];f.stopViewer();deliver(f,worker);
 assert.equal(worker.terminated,true);assert.equal(f.v.morph,null);assert.equal(f.v.pending,null);assert.equal(f.v.preparing,false);assert.equal(f.selected,0);assert.equal(f.meshes,original);
});
test('autoplay defaults to 30 seconds in the viewer, on re-entry and for captured specimens',()=>{
 const {f}=runtime();
 assert.equal(f.v.seconds,30);
 assert.equal(f.v.elapsed,0);
 assert.match(html, /<select id="viewerInterval">[^<]*(?:<option[^>]*>[^<]*<\/option>)*<option value="30" selected>30秒<\/option>/);
 assert.match(html, /viewer\.seconds=30;viewer\.elapsed=0;\$\('viewerInterval'\)\.value='30'/);
 assert.match(html, /\$\('watchStock'\)\.onclick=async\(\)=>\{[^}]*viewer\.seconds=Number\(\$\('viewerInterval'\)\.value\);viewer\.elapsed=0;updateViewerCountdown\(\)/);
 f.v.seconds=0;f.v.elapsed=9;
 f.stopViewer();
 assert.equal(f.v.seconds,30);
 assert.equal(f.v.elapsed,0);
 assert.equal(f.$('viewerInterval').value,'30');
});
test('clockwise bottom-left timer renders the real transition progress at 5, 30 and 60 seconds',()=>{
 assert.match(html, /<div class="viewer-state">[\s\S]*?<div class="viewer-countdown" id="viewerTimer"[^>]*>[\s\S]*?id="viewerTimerArc"/);
 assert.match(html, /\.viewer-countdown\{position:absolute;z-index:30;left:calc\(16px \+ env\(safe-area-inset-left,0px\)\)/);
 assert.match(html, /countdown-arc\{[^}]*stroke-width:7/);
 assert.match(html, /transform:rotate\(-90deg\)/);
 const {f}=runtime(),circle=f.$('viewerTimer'),arc=f.$('viewerTimerArc'),digits=f.$('viewerTimerSeconds'),length=2*Math.PI*24;
 f.updateViewerCountdown();
 assert.equal(circle.hidden,false);
 assert.equal(digits.textContent,'30');
 assert.equal(Number(arc.style.strokeDashoffset),0);
 for(const lengthSeconds of [5,20,30,60]){
  f.v.seconds=lengthSeconds;f.v.elapsed=lengthSeconds/4;
  f.updateViewerCountdown();
  assert.ok(Math.abs(Number(arc.style.strokeDashoffset)-length*.25)<1e-8);
  assert.equal(digits.textContent,String(Math.ceil(lengthSeconds*.75)));
  assert.equal(circle['aria-label'],'次の生体への進行状況');
 }
 f.v.seconds=30;f.v.elapsed=29.5;f.updateViewerCountdown();
 assert.ok(Number(arc.style.strokeDashoffset)>length*.9);
 assert.equal(digits.textContent,'1');
 f.v.elapsed=30;f.updateViewerCountdown();
 assert.ok(Math.abs(Number(arc.style.strokeDashoffset)-length)<1e-8);
 assert.equal(digits.textContent,'0');
});
test('countdown hides on stopped interval, missing next specimen or hidden tab; holds at zero during morph',()=>{
 const {f}=runtime(),circle=f.$('viewerTimer'),arc=f.$('viewerTimerArc'),length=2*Math.PI*24;
 f.updateViewerCountdown();assert.equal(circle.hidden,false);
 f.v.seconds=0;f.updateViewerCountdown();assert.equal(circle.hidden,true);
 f.v.seconds=30;f.document.hidden=true;f.updateViewerCountdown();assert.equal(circle.hidden,true);
 f.document.hidden=false;f.population.pop();f.updateViewerCountdown();assert.equal(circle.hidden,true);
 f.population.push({id:'b',seed:2,genome:{}});
 f.v.elapsed=14;f.v.preparing=true;f.updateViewerCountdown();
 assert.equal(circle.hidden,false);assert.ok(Math.abs(Number(arc.style.strokeDashoffset)-length)<1e-8);
 f.v.preparing=false;f.v.morph={};f.updateViewerCountdown();
 assert.equal(circle['aria-label'],'次の生体を読み込み中');
 f.v.morph=null;f.v.elapsed=0;f.updateViewerCountdown();
 assert.equal(Number(arc.style.strokeDashoffset),0);
 f.stopViewer();
 assert.equal(circle.hidden,true,'closing viewer hides the timer immediately');
 assert.equal(f.v.seconds,30);
});
test('timer pauses when hidden and phase transition adopts prepared meshes once',()=>{
 const {f,workers,events}=runtime();
 f.$('glview').parentElement={style:{setProperty(){}},appendChild(){}};
 f.v.seconds=5;f.document.hidden=true;f.tickViewer(6);
 assert.equal(f.v.elapsed,0);f.document.hidden=false;
 f.startViewerMorph();
 const target=deliver(f,workers[0],{seed:2,style:0,genome:{},parts:[],rigs:[],palette:{}},[]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 for(let i=0;i<14;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);assert.equal(f.spec,target);assert.ok(f.v.phaseFade);
 assert.equal(events.filter(e=>e==='apply').length,1);
 for(let i=0;i<14;i++)f.tickViewer(.12);
 assert.equal(f.v.phaseFade,null);
});
test('adjacent faces keep the same mapped endpoint for every shared vertex',()=>{
 const batches=ctx.createMorphBatches([b],[a],1),v0=Array.from(batches[0].end.slice(0,3)),v1=Array.from(batches[1].end.slice(0,3));assert.deepEqual(v0,v1);
 for(const t of [.1,.5,.9]){ctx.interpolateMorphBatch(batches[0],t);ctx.interpolateMorphBatch(batches[1],t);assert.deepEqual(Array.from(batches[0].data.slice(0,3)),Array.from(batches[1].data.slice(0,3)))}
});
test('navigation uses worker output, uploads ahead of time, and adopts prepared GPU buffers at completion',()=>{
 const {f,workers,events}=runtime(),original=f.meshes;
 f.createSpecimenForIndex=()=>{throw Error('Generation must not run on the rendering thread')};f.createMorphBatches=()=>{throw Error('Correspondence must not run on the rendering thread')};f.upload=()=>{throw Error('Synchronous upload must not be used')};
 f.startViewerMorph();assert.equal(f.meshes,original);assert.equal(f.v.morph,null);const target=deliver(f,workers[0]);f.tickViewer(.01);
 assert.ok(f.v.morph);assert.equal(f.v.morph.originalMeshes,original);assert.equal(f.selected,0);const prepared=f.v.morph.targetMeshes;
 for(let i=0;i<30;i++)f.tickViewer(.1);assert.equal(f.v.morph,null);assert.equal(f.selected,1);assert.equal(f.spec,target);assert.equal(f.spec.viewDistance,30);assert.equal(events.filter(x=>x==='apply').length,1);
 assert.equal(f.meshes,prepared);
});


test('zoom slider and pinch share distance bounds and preserve both morph endpoints when zoomed',()=>{
 const {f}=runtime();f.syncViewerZoom();const bounds=f.viewerZoomBounds();assert.equal(bounds.min,4);assert.equal(bounds.max,24);
 f.setViewerDistance(8);assert.equal(f.spec.viewDistance,8);f.setViewerDistance(100);assert.equal(f.spec.viewDistance,24);
 f.specimenViewDistance=()=>10;f.v.morph={source:f.spec,target:{},t:.5,fromDistance:20,toDistance:10};f.spec.viewDistance=15;f.setViewerDistance(7.5);assert.equal(f.v.morph.fromDistance,10);assert.equal(f.v.morph.toDistance,5);assert.equal(f.spec.viewDistance,7.5);
 f.v.morph=null;f.v.fit=2;assert.equal(f.viewerZoomBounds().max,48);
});

test('texture blending keeps the two pattern and coating identities fixed at every eased weight',()=>{
 const {f}=runtime(),values=new Map();f.gl.uniform1f=(key,value)=>values.set(key,[value]);f.gl.uniform4fv=(key,value)=>values.set(key,Array.from(value));
 f.spec={style:0,seed:1};f.v.morph={source:f.spec,target:{style:0,seed:2},patternA:new Map([['sourcePattern',[0,.3,3,.4]],['sourceCoating',[0,.6,.8,.2]]]),patternB:new Map([['nextPattern',[7,2.9,6,.8]],['nextCoating',[3,.9,.5,1.7]]]),t:0};
 for(const t of [0,.001,.25,.499,.5,.501,.75,.999,1]){
  f.v.morph.t=t;f.applyViewerMorphUniforms({uTextureMix:'mix',uOpticsControl:'controls'});
  assert.deepEqual(values.get('sourcePattern'),Array.from(new Float32Array([0,.3,3,.4])));assert.deepEqual(values.get('nextPattern'),Array.from(new Float32Array([7,2.9,6,.8])));
  assert.equal(values.get('sourceCoating')[0],0);assert.equal(values.get('nextCoating')[0],3);assert.deepEqual(values.get('mix'),[t]);
 }
});

test('texture snapshots use separate uniform locations and an ordinary draw resets the blend',()=>{
 const result=vm.runInContext(`(()=>{
  const original={},next={};for(const name of TEXTURE_ENDPOINT_UNIFORMS){original[name]=name;original['uNext'+name.slice(1)]='next:'+name}original.uTextureMix='mix';
  const locations=textureMorphUniforms(original),calls=new Map(),gl={uniform1f:(key,value)=>calls.set(key,[value]),uniform2f:(key,...value)=>calls.set(key,value),uniform3fv:(key,value)=>calls.set(key,Array.from(value)),uniform4fv:(key,value)=>calls.set(key,Array.from(value))};
  const a=pickPalette(731029),b=pickPalette(571938);applyPatternUniforms(gl,original,a);applyPatternUniforms(gl,locations,b);
  calls.set('mix',[.6]);applyPatternUniforms(gl,original,a);
  return {source:calls.get('uChromaA')[0],target:calls.get('next:uChromaA')[0],a:a.design.grammar,b:b.design.grammar,reset:calls.get('mix')[0],separate:TEXTURE_ENDPOINT_UNIFORMS.every(name=>locations[name]!==original[name])};
 })()`,ctx);
 assert.equal(result.source,result.a);assert.equal(result.target,result.b);assert.equal(result.reset,0);assert.equal(result.separate,true);
});

test('phase transfer never streams interpolated polygons into the GPU',()=>{
 const {f,workers,events}=runtime();
 f.$('glview').parentElement={style:{setProperty(){}},appendChild(){}};
 f.startViewerMorph();
 deliver(f,workers[0],{seed:2,style:0,genome:{},parts:[],rigs:[],palette:{}},[]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const initialUploads=events.filter(e=>e==='upload').length;
 for(let i=0;i<9;i++)f.tickViewer(.12);
 assert.equal(events.filter(e=>e==='upload').length,initialUploads);
 assert.equal(f.v.morph.mode,'phase');
 assert.equal(f.v.morph.batches.length,0);
});

test('preloading starts during observation without activating a morph or modifying source arrays',()=>{
 const {f,workers,events}=runtime(),original=f.meshes,before=Array.from(a.data);f.tickViewer(.1);
 assert.equal(workers.length,1);assert.equal(f.v.preparing,false);assert.equal(f.v.morph,null);assert.equal(f.meshes,original);assert.equal(events.length,0);
 const request=workers[0].request;assert.equal(request.record.seed,2);assert.equal(request.settings.density,.84);assert.deepEqual(Array.from(request.from),[],'phase transfer must not clone source topology');assert.deepEqual(Array.from(a.data),before);
 f.tickViewer(.1);assert.equal(workers.length,1);
});

test('GPU preparation obeys a byte budget and partial cancellation releases every allocated buffer',()=>{
 const {f,workers,events,transfers}=runtime();f.startViewerMorph();const huge={data:new Float32Array(17*40000),tri:new Uint16Array([0,1,2]),edges:new Uint16Array([0,1,1,2,2,0])};
 workers[0].onmessage({data:{ok:true,payload:{target:{seed:2},distance:15,targetMeshes:{shell:huge,parts:[],cilia:[]},batches:[]}}});
 f.advanceViewerPreparation();const bytes=transfers.reduce((n,t)=>n+(t.bytes||0),0);assert.ok(bytes<=262144);assert.ok(bytes>0);assert.equal(f.v.pending.ready,false);assert.equal(f.v.morph,null);
 const allocated=events.filter(e=>e==='allocate').length;f.stopViewer();assert.equal(f.v.pending,null);assert.equal(events.filter(e=>e.startsWith('delete:')).length,allocated);
});

test('worker failure preserves rendering state and is not retried every animation frame',()=>{
 const {f,workers}=runtime(),original=f.meshes;f.queueViewerPreparation(1);const warn=f.console;f.console={warn(){}};
 workers[0].onmessage({data:{ok:false,message:'worker failed'}});for(let i=0;i<12;i++)f.tickViewer(.016);
 assert.equal(workers.length,1);assert.equal(f.meshes,original);assert.equal(f.selected,0);assert.equal(f.v.seconds,0);assert.equal(f.v.preparing,false);f.console=warn;
});

test('reversing navigation invalidates an old worker result',()=>{
 const {f,workers}=runtime();f.population.push({id:'c',seed:3,genome:{}});f.queueViewerPreparation(1);const old=workers[0];f.startViewerMorph(-1);const current=workers[1];
 assert.equal(old.terminated,true);assert.equal(current.request.record.seed,3);deliver(f,old);assert.equal(f.v.pending.target,undefined);deliver(f,current,{seed:3});assert.equal(f.v.pending.target.seed,3);
});

test('the production adoption path uses prepared meshes without scanning, rebuilding, deleting or uploading',()=>{
 const next={seed:2,rigs:[],parts:[],ciliaDefs:[],emissionSites:[]},prepared={meshes:{shell:{buffer:'ready'},parts:[],cilia:[]},distance:15};
 Object.defineProperty(next,'shell',{get(){throw Error('Shape must not be scanned again')}});
 const fail=()=>{throw Error('Unexpected mesh preparation on adoption')},f={spec:{viewDistance:20},specimenViewDistance:fail,dynamicBatches:fail,createGpuCiliaMeshes:fail,destroyMeshes:fail,upload:fail,buildEmissionSites:fail,$:()=>({textContent:''})};
 vm.createContext(f);const code=src.slice(src.indexOf('function applyUploadedSpecimen('),src.indexOf('function refreshAnimatedSpecimen('));vm.runInContext(code,f);
 f.applyUploadedSpecimen(next,false,false,prepared);assert.equal(f.meshes,prepared.meshes);assert.equal(f.spec,next);assert.equal(next.viewDistance,15);
});

test('pressure, emission and bloom reach the exact incoming state while blink identities remain fixed',()=>{
 const {f}=runtime(),values=new Map(),u=new Proxy({},{get:(_,key)=>key});f.gl.uniform1f=(k,v)=>values.set(k,v);f.gl.uniform3fv=f.gl.uniform4fv=(k,v)=>values.set(k,Array.from(v));f.bioUniforms=ctx.bioUniforms;
 const bio=(p,v)=>({nodes:[{p:[p,0,0],radius:.5,pressure:p,velocity:v}],gene:new Float32Array([p,.5,.6,.7])});
 f.spec={seed:1,style:0,biome:bio(.2,.3),genome:{dev:{motionEnergy:1}}};f.$('motionAmp').value='125';
 const emission=(n,mode)=>({sites:Array.from({length:4},()=>[n,0,0,.3]),strength:n,tint:[n,.2,.3],mode,speed:n,seed:n,bloom:n*100});
 f.v.morph={source:f.spec,target:{seed:2,style:0,biome:bio(.8,.7),genome:{dev:{motionEnergy:2}}},patternA:new Map(),patternB:new Map(),emissionA:emission(.2,1),emissionB:emission(.8,6),t:0};
 for(const t of [0,.25,.5,.75,1]){
  f.v.morph.t=t;f.applyViewerMorphUniforms(u);assert.ok(Math.abs(values.get('uBioPressure')[0]-(.2+.6*t))<1e-6);assert.equal(values.get('uBlinkMode'),1);assert.equal(values.get('uNextBlinkMode'),6);
  assert.equal(values.get('uNextEmission'),.8);assert.ok(Math.abs(f.viewerGlowSetting('bloomRadius')-(20+60*t))<1e-6);assert.ok(Math.abs(f.viewerGlowTint()[0]-(.2+.6*t))<1e-6);
 }
 assert.deepEqual(values.get('uBioPressure'),Array.from(new Float32Array([.8,0,0,0])));assert.equal(values.get('uMotion'),2.5);
});

test('the render loop advances the incoming pressure simulation before adoption',()=>{
 const {f}=runtime(),steps=[];Object.assign(f,{animating:true,lastFrame:0,environmentTime:0,psychedelicTime:0,rigTime:0,bodyTime:0,patternTime:0,modelYaw:0,auto:false,requestAnimationFrame(){},render(){},tickViewer(){},stepBiomeSystem:(bio,elapsed,speed)=>steps.push({bio,elapsed,speed})});
 f.tickBackgroundCycle=()=>{};f.spec={biome:{name:'source'},genome:{}};f.v.morph={target:{biome:{name:'target'}}};f.$('motionSpeed').value='100';f.$('bodySpeed').value='100';
 vm.runInContext(src.slice(src.indexOf('let framesInWindow='),src.indexOf('function close(){')),f);f.frame(16);
 assert.equal(steps.length,2);assert.equal(steps[0].bio.name,'source');assert.equal(steps[1].bio.name,'target');assert.equal(steps[0].elapsed,steps[1].elapsed);assert.equal(steps[0].speed,steps[1].speed);
});

test('the real Worker builds identical target geometry while the main event loop keeps running',{timeout:30000},async t=>{
 const {Worker}=require('node:worker_threads'),crypto=require('node:crypto');
 const request=vm.runInContext(`(()=>{const g=makeFounderGenome(731029,0,4),sp=makeSpecimen(g.seed,g.style,pickPalette(g.seed,g.colorDNA,g.patternDNA),true,null,.75,.84,.75,0,null,copyJSON(g));return {record:{seed:571938,genome:makeFounderGenome(571938,0,3)},settings:{variance:.75,density:.84,micro:.75},from:[dynamicMesh(sp.shell,0,0,[0,0,0]),...dynamicBatches(sp).map(p=>p.mesh)]}})()`,ctx);
 const before=JSON.stringify(request.record),sourceLength=request.from[0].data.byteLength;
 const script="const {parentPort}=require('node:worker_threads');const self={postMessage:(value,transfer)=>parentPort.postMessage(value,transfer)};"+ctx.viewerWorkerSource(core)+";parentPort.on('message',data=>self.onmessage({data}));";
 const worker=new Worker(script,{eval:true});let ticks=0;const interval=setInterval(()=>ticks++,2);
 try{
  const message=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage(request)});assert.equal(message.ok,true,message.message);assert.ok(ticks>=5,'render/event loop must be able to keep ticking');
  ctx.transitionRequest=structuredClone(request);const direct=vm.runInContext('buildViewerTransition(transitionRequest)',ctx),hash=a=>crypto.createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
  assert.equal(hash(message.payload.target.shell.data),hash(direct.target.shell.data));assert.equal(hash(message.payload.targetMeshes.shell.data),hash(direct.targetMeshes.shell.data));
  assert.deepEqual(message.payload.batches.map(b=>hash(b.end)),Array.from(direct.batches,b=>hash(b.end)));
  assert.equal(request.from[0].data.byteLength,sourceLength);assert.equal(JSON.stringify(request.record),before);assert.ok(message.payload.batches.every(b=>b.tri.length<=12000));
  t.diagnostic('Main event-loop heartbeat during worker preparation: '+ticks+' ticks; all target/correspondence hashes match');
 }finally{clearInterval(interval);await worker.terminate()}
});

 test('duplicated corners stay welded at different triangle indices throughout morphing',()=>{
 const make=z=>mesh([[0,0,z],[1,0,z],[0,1,z],[1,1,z]],[0,1,2,2,0,3]);
 for(const limit of [1,12000]){
  const batches=ctx.createMorphBatches([make(0)],[make(1)],limit);
  for(const t of [.03,.13,.37,.51,.79,.97]){
   const positions=new Map();
   for(const batch of batches){ctx.interpolateMorphBatch(batch,t);for(let i=0;i<batch.data.length;i+=17){
    const key=batch.side+':'+[...batch.start.slice(i,i+3),...batch.end.slice(i,i+3)].join(',');
    const point=Array.from(batch.data.slice(i,i+3));
    if(positions.has(key))assert.deepEqual(point,positions.get(key),'shared vertex split at t='+t);
    positions.set(key,point);
   }}
  }
 }
 });

test('production phase transfer preserves native geometry and does not build intermediate topology',()=>{
 assert.match(src,/const batches=\[\]; \/\/ Native-mesh phase transition/);
 assert.match(src,/const from=\[\]; \/\/ No cross-topology correspondence/);
 assert.match(src,/viewer\.morph=\{mode:'phase'/);
 assert.match(src,/if\(m&&m\.mode==='phase'\)/);
 assert.match(src,/const useLocal=!!\(spec\.localGroup&&meshes\.localShell&&\(!viewer\.morph\|\|viewer\.morph\.mode==='phase'\)\)/);
});
test('phase handoff adopts prepared native meshes at opaque midpoint, then reveals them',()=>{
 const {f,workers,events}=runtime(),source=f.meshes;
 f.$('glview').parentElement={style:{setProperty(){}},appendChild(){}};
 f.startViewerMorph();
 const target=deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 assert.equal(f.v.morph.mode,'phase');
 assert.equal(f.meshes,source,'first half must keep all source meshes');
 for(let i=0;i<14;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
 assert.equal(f.spec,target);
 assert.ok(f.v.phaseFade);
 for(let i=0;i<14;i++)f.tickViewer(.12);
 assert.equal(f.v.phaseFade,null);
 assert.equal(events.filter(e=>e==='apply').length,1);
});

test('particle phase transition does not fade the full scene or mutate topology',()=>{
 assert.match(html,/function phaseParticlesDraw\(progress,source,target\)/);
 assert.match(html,/function phaseSurfacePoints\(meshesGroup,seed,count=360\)/);
 assert.match(html,/canvas\.style\.opacity=String\(1-v\)/);
 assert.doesNotMatch(html,/\.scene::after\{content:"";position:absolute;inset:0;z-index:13/);
 assert.match(html,/phaseParticlesDraw\(p\*\.5,phaseParticleSource,phaseParticleTarget\)/);
 assert.match(html,/phaseParticlesDraw\(\.5\+reveal\*\.5,phaseParticleSource,phaseParticleTarget\)/);
});
test('loading DNA assembles many horizontal base pairs into 3D helix without gradients',()=>{
 const boot=scripts.find(script=>script.includes("const n=26,cx=w/2"))||'';
 assert.match(boot,/const n=26,cx=w\/2/);
 assert.match(boot,/kind:'bond'/);
 assert.match(boot,/for\(const side of \[-1,1\]\)/);
 assert.doesNotMatch(boot,/createLinearGradient|createRadialGradient|shadowBlur/);
});
