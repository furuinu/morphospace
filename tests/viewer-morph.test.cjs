const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2],core=src.slice(0,src.indexOf("const canvas=$('glview'),gl="));
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(core,ctx);
function mesh(vertices,tri){const data=new Float32Array(vertices.length*17);vertices.forEach((p,i)=>data.set([...p,0,0,1,1,0,0,0,0,0,0,0,0,0,0],i*17));return{data,tri:new Uint16Array(tri),edges:new Uint16Array(tri.flatMap((v,i)=>[v,tri[i-i%3+(i+1)%3]]))}}
const a=mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]),b=mesh([[0,0,1],[2,0,1],[0,2,1],[-2,0,1]],[0,1,2,0,2,3]);
function runtime(){
 const elements={},events=[],workers=[],transfers=[],defaults={variance:75,density:84,emitColor:0,emissionStrength:110,emitBlink:1,blinkSpeed:65,bloomRadius:105};let bufferId=0;
 const f={console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),TAU:Math.PI*2,performance:{now:()=>100},document:{hidden:false,createElement:()=>({className:'',hidden:false,setAttribute(){},getContext:()=>null})},spec:{seed:1,style:0,baseViewDistance:10,viewDistance:20},selected:0,activeStoredIndividual:null,busy:false,videoRecording:null,nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,population:[{id:'a',seed:1,genome:{}},{id:'b',seed:2,genome:{}}],meshes:{id:'original',shell:{...a,buffer:'old',triBuffer:'old-tri',lineBuffer:'old-lines'},parts:[],cilia:[]},rigMeshes:[],genomes:[{},{}],seeds:[1,2],previewSpecimens:[null,null],detailSpecimens:[null,null],detailCacheOrder:[],
  VIEWER_CORE_SOURCE:core,viewerWorkerSource:ctx.viewerWorkerSource,viewerMorphSurfaces:ctx.viewerMorphSurfaces,textureMorphUniforms:ctx.textureMorphUniforms,renderer:{vars:{}},canvas:{width:1120,height:780,getBoundingClientRect:()=>({width:1120,height:780})},modelYaw:0,modelPitch:0,cameraRoll:0,worldCameraFrame:()=>({right:[1,0,0],up:[0,1,0],back:[0,0,1],position:[0,0,20]}),panX:0,panY:0,pulseTravel:{specimen:null,position:[0,0,0],velocity:[0,0,0],camera:[0,0,0]},resetPulseTravel:(target,preserve)=>{f.pulseTravel.specimen=target;f.pulseTravel.position.fill(0);f.pulseTravel.velocity.fill(0);if(!preserve)f.pulseTravel.camera.fill(0)},transitionSpecimenBounds:ctx.transitionSpecimenBounds,cameraHandoffDistance:ctx.cameraHandoffDistance,cameraHandoffClearances:ctx.cameraHandoffClearances,cameraViewEnvelope:ctx.cameraViewEnvelope,cameraHandoffDirection:ctx.cameraHandoffDirection,cameraSkyFlowDirection:()=>[1,0],cameraHandoffDuration:ctx.cameraHandoffDuration,cameraHandoffEase:ctx.cameraHandoffEase,cameraHandoffFrame:ctx.cameraHandoffFrame,CAMERA_HANDOFF_SECONDS:4,CAMERA_HANDOFF_SWITCH:.5375,CAMERA_ORBIT_BASE_SPEED:.0796875,cameraOrbitSpeed:-.0796875,cameraOrbitPitchSpeed:0,cameraOrbitRollSpeed:0,cameraOrbitTargetSpeed:-.0796875,cameraOrbitTargetPitchSpeed:0,cameraOrbitTargetRollSpeed:0,cameraOrbitYawOffset:0,cameraOrbitPitchOffset:0,cameraOrbitChooseHeading:()=>{},cameraOrbitAngularSpeed:()=>.0796875,buildEmissionSites:()=>Array.from({length:4},()=>[0,0,0,.3]),getSpecEmissionDNA:()=>({colorMode:0,strength:110,blinkMode:1,blinkSpeed:65,bloomRadius:105}),EMIT_COLORS:[[.2,.8,1]],
  streamNextIndividual(){const n=f.population.length;f.population.push({id:'b'+n,seed:2,genome:{}});f.genomes.push({});f.seeds.push(2);f.previewSpecimens.push(null);f.detailSpecimens.push(null);},syncStreamUI(){},streamModeLabel:()=> '野生',
  Blob:class{},URL:{createObjectURL:()=> 'blob:worker'},Worker:class{constructor(){workers.push(this)}postMessage(value){this.request=value}terminate(){this.terminated=true}},
  gl:{ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,STATIC_DRAW:3,DYNAMIC_DRAW:4,createBuffer:()=> 'new-'+(++bufferId),bindBuffer(){},bufferData(target,size){events.push('allocate');transfers.push({allocate:size})},bufferSubData(target,offset,data){events.push('upload');transfers.push({bytes:data.byteLength})},deleteBuffer:buffer=>events.push('delete:'+buffer)},
  applyUploadedSpecimen:(sp,preserve,metadata,prepared)=>{assert.ok(prepared);f.spec=sp;f.meshes=prepared.meshes;events.push('apply')},currentIndividual:()=>({name:'original'}),recordDisplayName:r=>r.name,viewerMetadata:()=>events.push('metadata'),viewerPatternValues:()=>new Map(),morphFrameFactors:ctx.morphFrameFactors,interpolateMorphBatch:ctx.interpolateMorphBatch,layeredMorphScale:ctx.layeredMorphScale,interpolateLayeredMorphBatch:ctx.interpolateLayeredMorphBatch,
  MICRO_DENSITY:.75,$:id=>elements[id]||(elements[id]={open:false,value:String(defaults[id]??0),textContent:'',checked:true,hidden:false,style:{},classList:{toggle(){},add(){},remove(){},contains(){return true}},setAttribute(k,v){this[k]=v}})};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const viewer='),src.indexOf("$('viewerFullscreen').onclick=")),f);f.viewerMetadata=()=>events.push('metadata');f.viewerPatternValues=()=>new Map();f.v=vm.runInContext('viewer',f);return{f,events,workers,transfers};
}
function deliver(f,worker,target={seed:2,style:0,genome:{},parts:[],rigs:[],palette:{}}){
 worker.onmessage({data:{ok:true,payload:{target,distance:15,targetMeshes:{shell:b,parts:[],cilia:[]},bounds:{radius:5}}}});return target;
}
function stored(id,seed){return{id,payload:{record:{id,seed,name:id,genome:{}}}}}
test('offscreen radius includes all appendages and GPU cilia',()=>{
 const shell=mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]);
 const arm=mesh([[0,0,0],[0,0,9],[0,1,9]],[0,1,2]);
 const cilium={data:new Float32Array(26),tri:new Uint16Array(0)};cilium.data[14]=12;
 const bounds=ctx.transitionSpecimenBounds({localGroup:null},{shell,parts:[{kind:'branch',mesh:arm}],cilia:[cilium]});
 assert.ok(bounds.radius>12,'GPU cilium tip omitted');
 assert.ok(bounds.radius>9,'tentacle tip omitted');
 const distance=ctx.cameraHandoffDistance(bounds,bounds,20,20,1.6);
 const clearance=ctx.cameraHandoffClearances(bounds,bounds,20,20,1.6);
 assert.ok(clearance.exit>bounds.radius&&clearance.entry>bounds.radius);
 assert.ok(Math.abs(distance-(clearance.exit+clearance.entry)/2)<1e-7);
 assert.ok(ctx.cameraHandoffDistance(bounds,bounds,10,10,1.6)<distance,
  'closer zoom must shrink the visible-world clearance');
});
test('short camera sweeps complete faster without interrupting continuous travel',()=>{
 const duration=ctx.cameraHandoffDuration;
 const short=duration(9,20,20),medium=duration(25,20,20),long=duration(75,20,20);
 assert.ok(short>=3.6&&short<medium&&medium<long);
 assert.ok(long<=22,'large silhouettes still use a measured maximum interval');
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 const expected=m.exitDuration+m.warpDuration;
 assert.ok(Math.abs(m.duration-expected)<1e-8,'warp duration must include both exit and high-speed travel');
 for(let i=0;i<Math.ceil(m.duration/.12)+2&&f.v.morph;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
});
test('camera travels in one direction without stopping between the two organisms',()=>{
 const m={travelDistance:75,yawSign:1},ts=[0,.1,.22,.4625,.49,.5,.51,.5375,.6,.8,1];
 const frames=ts.map(p=>ctx.cameraHandoffFrame(m,p));
 for(let i=1;i<frames.length;i++)assert.ok(frames[i].travel>frames[i-1].travel,
  'camera position must advance on every interior sample');
 assert.equal(frames[0].travel,0);
 assert.equal(frames[3].switched,false);
 assert.equal(frames[4].switched,false);
 assert.equal(frames[5].switched,true,'the native geometry swap occurs at the offscreen midpoint');
 assert.ok(frames[3].travel<75,'A must already be moving beyond the frame at 1.85 seconds');
 assert.equal(frames[5].travel,75);
 assert.ok(frames[7].travel>75,'B must be moving into view by 2.15 seconds');
 assert.ok(Math.abs(frames.at(-1).travel-150)<1e-8);
 assert.equal(frames.at(-1).yaw,0);
 assert.equal(frames.at(-1).progress,1);
});
test('camera exits at freely sampled angles rather than nearest fixed screen boundary',()=>{
 const radius={radius:2};
 const directions=new Set(Array.from({length:64},()=>Array.from(ctx.cameraHandoffDirection([6,-5],radius,20,1.7)).map(x=>x.toFixed(3)).join(',')));
 assert.ok(directions.size>=20,'departure heading should vary across transitions');
 for(const key of directions){
  const [x,y]=key.split(',').map(Number);
  assert.ok(Math.abs(Math.hypot(x,y)-1)<.003,'departure direction must be normalized');
  assert.ok(Math.abs(x)>=.15&&Math.abs(y)>=.15,'departure requires visible horizontal and vertical travel');
 }
});
test('camera has continuous non-zero velocity across offscreen gap and native swap',()=>{
 const m={travelDistance:50};
 const pos=t=>ctx.cameraHandoffFrame(m,t/4).travel;
 for(const t of [1.7,1.85,1.99,2,2.01,2.15,2.3]){
  assert.ok(pos(t+.01)>pos(t),'camera stopped during transition at '+t);
 }
 const h=.0005;
 for(const t of [1.85,2,2.15]){
  const before=(pos(t)-pos(t-h))/h,after=(pos(t+h)-pos(t))/h;
  assert.ok(before>0&&after>0,'camera velocity must remain positive at '+t);
  assert.ok(Math.abs(before-after)<.01,'no velocity discontinuity at '+t);
 }
 const left=pos(2)-pos(1.85),right=pos(2.15)-pos(2);
 assert.ok(Math.abs(left-right)<1e-8,'matched travel over both 0.15-second halves');
 assert.ok(Math.abs(pos(4)-100)<1e-8);
});

test('camera transition holds A intact until fully offscreen and never uploads morph frames',()=>{
 const {f,workers,events}=runtime(),original=f.meshes;
 f.startViewerMorph();const target=deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 assert.equal(f.v.morph.mode,'camera-pan');
 assert.equal(f.spec.seed,1);
 assert.equal(f.meshes,original);
 const before=events.filter(e=>e==='upload').length;
 for(let i=0;i<Math.floor(f.v.morph.exitDuration*.8/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec.seed,1,'source must still be active before the handoff');
 assert.equal(f.v.morph.switched,false);
 for(let i=0;i<Math.ceil((f.v.morph.exitDuration*.2+.25)/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec,target,'target must become visible only after A exits');
 assert.equal(f.v.morph.switched,true);
 assert.equal(f.v.morph.batches.length,0);
 assert.equal(events.filter(e=>e==='upload').length,before,'no dynamic mesh transfer during camera movement');
});
test('cancelling after B becomes active restores original A meshes and view',()=>{
 const {f,workers}=runtime(),source=f.spec,original=f.meshes;
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 for(let i=0;i<Math.ceil((f.v.morph.exitDuration+.25)/.12);i++)f.tickViewer(.12);
 assert.equal(f.v.morph.switched,true);
 f.cancelViewerMorph(false);
 assert.equal(f.v.morph,null);assert.equal(f.spec,source);assert.equal(f.meshes,original);
 assert.equal(f.spec.viewDistance,20);
});
test('camera and specimen preserve absolute world location at completion',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph,anchor=m.warpTarget.slice();
 assert.deepEqual(Array.from(f.v.worldOffset),[0,0,0]);
 for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
 for(let i=0;i<3;i++)assert.ok(Math.abs(f.v.worldOffset[i]-anchor[i])<1e-6);
 f.stopViewer();
 assert.deepEqual(Array.from(f.v.worldOffset),[0,0,0]);
});
test('camera handoff joins source exit and target entry at one boundary without a dead interval',()=>{
 const source={radius:18},target={radius:25},distance=40,aspect=1.8;
 const clear=ctx.cameraHandoffClearances(source,target,distance,distance,aspect,[0,0],[1,0]);
 const targetViewport=ctx.cameraViewEnvelope(distance,aspect,target.radius);
 const sourceViewport=ctx.cameraViewEnvelope(distance,aspect,source.radius);
 assert.ok(Math.abs(clear.entry-(targetViewport.halfWidth+target.radius))<1e-6,
  'B must begin precisely at the zoom-dependent viewport edge');
 assert.ok(Math.abs(clear.exit-(sourceViewport.halfWidth+source.radius))<1e-6,
  'A must clear the same projection boundary');
 const travel=(clear.exit+clear.entry)/2,switchAt=clear.exit/(clear.exit+clear.entry);
 assert.ok(Math.abs(ctx.cameraHandoffDistance(source,target,distance,distance,aspect)-travel)<1e-8);
 const m={travelDistance:travel,switchAt,yawSign:1};
 // The switch boundary is a travel ratio; the camera's eased clock is not linear.
 const ts=Array.from({length:1001},(_,i)=>i/1000);
 const index=ts.findIndex(t=>ctx.cameraHandoffFrame(m,t).switched);
 assert.ok(index>0&&index<1000);
 const before=ctx.cameraHandoffFrame(m,ts[index-1]),at=ctx.cameraHandoffFrame(m,ts[index]);
 assert.equal(before.switched,false);assert.equal(at.switched,true);
 assert.ok(before.travel<=clear.exit&&at.travel>=clear.exit,'geometry changes at exit clearance');
 assert.ok(at.travel-before.travel<1,'handoff should not insert an empty-space traversal');
});
test('camera pan renders finished body and appendages without layered LOD',()=>{
 assert.ok(src.includes("base=mul4(translate3(...viewer.worldOffset),base)"));
 assert.ok(src.includes("const useLocal=!!(spec.localGroup&&meshes.localShell&&(!viewer.morph||viewer.morph.mode==='camera-pan'||viewer.morph.mode==='fuse'))"));
 assert.ok(src.includes("if(!isolatedSpecimenFrame&&!nanoAction&&viewer.morph?.mode==='camera-pan'&&viewer.morph.switched)"));
 assert.ok(src.includes("m.warpChase?m.warpTarget[i]:2*m.travelDistance*m.travelAxis[i]"));
 assert.ok(src.includes("const rawBatches=from.length?createMorphBatches")===false);
});
test('native A and B materials are not blended during offscreen handoff',()=>{
 assert.ok(src.includes("!m.patternA||!m.patternB||m.mode==='phase'||m.mode==='camera-pan'||spec!==m.source"));
 assert.ok(src.includes("viewer.morph.mode!=='camera-pan'&&spec===viewer.morph.source"));
 assert.ok(src.includes("viewer.morph.mode==='camera-pan'"));
 assert.ok(src.includes("if(!isolatedSpecimenFrame&&!nanoAction&&viewer.morph?.mode==='camera-pan'&&viewer.morph.switched)"));
 assert.ok(!src.includes("mode:'layered',index:job.index"));
 assert.ok(src.includes("const useLocal=!!(spec.localGroup&&meshes.localShell&&(!viewer.morph||viewer.morph.mode==='camera-pan'||viewer.morph.mode==='fuse'))"));
});
test('captured-only playback adopts saved identities without changing the gallery or its mesh cache',()=>{
 const {f,workers}=runtime(),first=stored('saved-a',101),second=stored('saved-b',102);f.stockEntries=[first,second];f.activeStoredIndividual=first;f.v.source='stock';
 const population=JSON.stringify(f.population),cached={gallery:true};f.detailSpecimens[0]=cached;
 f.startViewerMorph();assert.equal(workers[0].request.record.seed,102);deliver(f,workers[0],{seed:102,style:0,genome:{},parts:[],rigs:[],palette:{}});
 f.advanceViewerPreparation();f.activateViewerPreparation();for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);assert.equal(f.v.morph,null);assert.ok(!f.v.phaseFade,'fog transition must remain inactive');
 assert.equal(f.activeStoredIndividual,second);assert.equal(f.spec.seed,102);assert.equal(f.detailSpecimens[0],cached);assert.equal(JSON.stringify(f.population),population);assert.equal(f.v.source,'stock');
 f.queueViewerPreparation();assert.equal(workers[1].request.record.seed,101);
});
test('random next excludes the current organism and holds one choice throughout preloading in either collection',()=>{
 for(const source of ['gallery','stock']){
  const {f,workers}=runtime();f.population.push({id:'c',seed:3,genome:{}});f.stockEntries=[stored('x',101),stored('y',102),stored('z',103)];f.v.source=source;f.v.random=true;
  if(source==='stock')f.activeStoredIndividual=f.stockEntries[0];
  vm.runInContext('Math.random=()=>.99',f);f.queueViewerPreparation();const chosen=workers[0].request.record.seed;assert.equal(chosen,source==='stock'?103:2); // Wild stream fixture appends seed 2; it replaces the old fixed gallery successor.
  for(let i=0;i<30;i++)f.queueViewerPreparation();assert.equal(workers.length,1);assert.equal(workers[0].terminated,undefined);
  f.startViewerMorph(-1);assert.equal(workers[0].terminated,true);if(source==='stock')assert.equal(workers[1].request.record.seed,103);else assert.equal(workers.length,1,'the first wild specimen has no previous organism');
 }
});
test('a single capture can be entered from the gallery but never morphs back into the gallery',()=>{
 const {f,workers}=runtime();f.stockEntries=[stored('only',101)];f.v.source='stock';f.startViewerMorph();assert.equal(workers[0].request.record.seed,101);
 deliver(f,workers[0],{seed:101,style:0,genome:{},parts:[],rigs:[],palette:{}});f.advanceViewerPreparation();f.activateViewerPreparation();for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);assert.equal(f.v.morph,null);assert.ok(!f.v.phaseFade,'fog transition must remain inactive');
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
 const {f}=runtime(),circle=f.$('viewerTimer'),arc=f.$('viewerTimerArc'),length=2*Math.PI*24;
 f.updateViewerCountdown();
 assert.equal(circle.hidden,false);
 assert.equal(Number(arc.style.strokeDashoffset),0);
 for(const lengthSeconds of [5,20,30,60]){
  f.v.seconds=lengthSeconds;f.v.elapsed=lengthSeconds/4;
  f.updateViewerCountdown();
  assert.ok(Math.abs(Number(arc.style.strokeDashoffset)-length*.25)<1e-8);
  assert.equal(circle['aria-label'],'次の生体への進行状況');
 }
 f.v.seconds=30;f.v.elapsed=29.5;f.updateViewerCountdown();
 assert.ok(Number(arc.style.strokeDashoffset)>length*.9);
 f.v.elapsed=30;f.updateViewerCountdown();
 assert.ok(Math.abs(Number(arc.style.strokeDashoffset)-length)<1e-8);
});
test('countdown hides on stopped interval, missing next specimen or hidden tab; holds at zero during morph',()=>{
 const {f}=runtime(),circle=f.$('viewerTimer'),arc=f.$('viewerTimerArc'),length=2*Math.PI*24;
 f.updateViewerCountdown();assert.equal(circle.hidden,false);
 f.v.seconds=0;f.updateViewerCountdown();assert.equal(circle.hidden,true);
 f.v.seconds=30;f.document.hidden=true;f.updateViewerCountdown();assert.equal(circle.hidden,true);
 f.document.hidden=false;f.population.pop();f.updateViewerCountdown();assert.equal(circle.hidden,false,'the infinite wild stream has a next specimen even with one loaded');
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
test('timer pauses when hidden and camera handoff adopts prepared meshes once',()=>{
 const {f,workers,events}=runtime();
 f.$('glview').parentElement={style:{setProperty(){}},appendChild(){}};
 f.v.seconds=5;f.document.hidden=true;f.tickViewer(6);
 assert.equal(f.v.elapsed,0);f.document.hidden=false;
 f.startViewerMorph();
 const target=deliver(f,workers[0],{seed:2,style:0,genome:{},parts:[],rigs:[],palette:{}},[]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);assert.equal(f.spec,target);assert.ok(!f.v.phaseFade,'fog transition must remain inactive');
 assert.equal(events.filter(e=>e==='apply').length,1);
 for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);
 assert.ok(!f.v.phaseFade,'fog transition must remain inactive');
});
test('navigation uses worker output, uploads ahead of time, and adopts prepared GPU buffers at completion',()=>{
 const {f,workers,events}=runtime(),original=f.meshes;
 f.createSpecimenForIndex=()=>{throw Error('Generation must not run on the rendering thread')};f.createMorphBatches=()=>{throw Error('Correspondence must not run on the rendering thread')};f.upload=()=>{throw Error('Synchronous upload must not be used')};
 // This sandbox fits at 0.5; a remembered zoom with ratio 2 (2.4·(0.32/2.4)^(z/100)=2) frames at the worker's 30.
 f.v.zoomValue=100*Math.log(2/2.4)/Math.log(.32/2.4);
 f.startViewerMorph();assert.equal(f.meshes,original);assert.equal(f.v.morph,null);const target=deliver(f,workers[0]);f.tickViewer(.01);
 assert.ok(f.v.morph);assert.equal(f.v.morph.originalMeshes,original);assert.equal(f.selected,0);const prepared=f.v.morph.targetMeshes;
 for(let i=0,steps=Math.ceil(f.v.morph.duration/.1)+2;i<steps;i++)f.tickViewer(.1);assert.equal(f.v.morph,null);assert.equal(f.selected,1);assert.equal(f.spec,target);assert.ok(Math.abs(f.spec.viewDistance-30)<1e-9,String(f.spec.viewDistance)+" "+f.v.zoomValue);assert.equal(events.filter(x=>x==='apply').length,1);
 assert.equal(f.meshes,prepared);
});


test('zoom slider and pinch preserve camera handoff distance endpoints',()=>{
 const {f}=runtime();f.syncViewerZoom();const bounds=f.viewerZoomBounds();assert.equal(bounds.min,4);assert.equal(bounds.max,24);
 f.setViewerDistance(8);assert.equal(f.spec.viewDistance,8);f.setViewerDistance(100);assert.equal(f.spec.viewDistance,24);
 f.specimenViewDistance=()=>10;f.v.morph={source:f.spec,target:{},t:.5,fromDistance:20,toDistance:10};f.spec.viewDistance=15;f.setViewerDistance(7.5);assert.equal(f.v.morph.fromDistance,10);assert.equal(f.v.morph.toDistance,5);assert.equal(f.spec.viewDistance,7.5);
 f.v.morph=null;f.v.fit=2;assert.equal(f.viewerZoomBounds().max,48);
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

test('preloading starts during observation without activating a morph or modifying source arrays',()=>{
 const {f,workers,events}=runtime(),original=f.meshes,before=Array.from(a.data);f.tickViewer(.1);
 assert.equal(workers.length,1);assert.equal(f.v.preparing,false);assert.equal(f.v.morph,null);assert.equal(f.meshes,original);assert.equal(events.length,0);
 const request=workers[0].request;assert.equal(request.record.seed,2);assert.equal(request.settings.density,.84);assert.equal('from' in request,false,'do not clone A topology');assert.equal('fromAppendages' in request,false);assert.deepEqual(Array.from(a.data),before);
 f.tickViewer(.1);assert.equal(workers.length,1);
});

test('GPU preparation obeys a byte budget and partial cancellation releases every allocated buffer',()=>{
 const {f,workers,events,transfers}=runtime();f.startViewerMorph();const huge={data:new Float32Array(17*40000),tri:new Uint16Array([0,1,2]),edges:new Uint16Array([0,1,1,2,2,0])};
 workers[0].onmessage({data:{ok:true,payload:{target:{seed:2},distance:15,targetMeshes:{shell:huge,parts:[],cilia:[]},bounds:{radius:5}}}});
 f.advanceViewerPreparation();const bytes=transfers.reduce((n,t)=>n+(t.bytes||0),0);assert.ok(bytes<=262144);assert.ok(bytes>0);assert.equal(f.v.pending.ready,false);assert.equal(f.v.morph,null);
 const allocated=events.filter(e=>e==='allocate').length;f.stopViewer();assert.equal(f.v.pending,null);assert.equal(events.filter(e=>e.startsWith('delete:')).length,allocated);
});

test('worker failure preserves rendering state and is not retried every animation frame',()=>{
 const {f,workers}=runtime(),original=f.meshes;f.queueViewerPreparation(1);const warn=f.console;f.console={warn(){}};
 workers[0].onmessage({data:{ok:false,message:'worker failed'}});for(let i=0;i<12;i++)f.tickViewer(.016);
 assert.equal(workers.length,1);assert.equal(f.meshes,original);assert.equal(f.selected,0);assert.equal(f.v.seconds,0);assert.equal(f.v.preparing,false);f.console=warn;
});

test('reversing navigation invalidates an old worker result',()=>{
 const {f,workers}=runtime();f.population.push({id:'c',seed:3,genome:{}});f.selected=1;f.queueViewerPreparation(1);const old=workers[0];f.startViewerMorph(-1);const current=workers[1];
 assert.equal(old.terminated,true);assert.equal(current.request.record.seed,1);deliver(f,old);assert.equal(f.v.pending.target,undefined);deliver(f,current,{seed:1});assert.equal(f.v.pending.target.seed,1);
});

test('the production adoption path uses prepared meshes without scanning, rebuilding, deleting or uploading',()=>{
 const next={seed:2,rigs:[],parts:[],ciliaDefs:[],emissionSites:[]},prepared={meshes:{shell:{buffer:'ready'},parts:[],cilia:[]},distance:15};
 Object.defineProperty(next,'shell',{get(){throw Error('Shape must not be scanned again')}});
 const fail=()=>{throw Error('Unexpected mesh preparation on adoption')},f={spec:{viewDistance:20},specimenViewDistance:fail,dynamicBatches:fail,createGpuCiliaMeshes:fail,destroyMeshes:fail,upload:fail,buildEmissionSites:fail,$:()=>({textContent:''})};
 vm.createContext(f);const code=src.slice(src.indexOf('function applyUploadedSpecimen('),src.indexOf('function refreshAnimatedSpecimen('));vm.runInContext(code,f);
 f.applyUploadedSpecimen(next,false,false,prepared);assert.equal(f.meshes,prepared.meshes);assert.equal(f.spec,next);assert.equal(next.viewDistance,15);
});


test('one-finger specimen rotation does not disable sky orbit or accumulate warp roll',()=>{
 const start=src.indexOf("canvas.addEventListener('pointermove'");
 const end=src.indexOf("for(const ev of ['pointerup'",start);
 assert.ok(start>=0&&end>start,'Pointer handling must be present');
 const pointer=src.slice(start,end);
 assert.match(pointer,/rotateSpecimenByPointer\(dx,dy\)/,'The finger must rotate the specimen');
 assert.doesNotMatch(pointer,/auto=false|\$\('auto'\)\.checked=false/,
  'Touch must not permanently freeze the background orbit');
 assert.match(src,/if\(typeof drag==='undefined'\|\|!drag\)stepCameraOrbit/,
  'Sky movement must resume after the touch ends');
 assert.match(src,/if\(!m\.manualGazeBase\)m\.manualGazeBase=/,
  'Manual-camera flight offsets must be based on one stable angle');
 assert.match(src,/cameraRoll=flight\[2\]/,
  'Manual-camera roll must not accumulate every frame');
});
test('the render loop advances the incoming pressure simulation before adoption',()=>{
 const {f}=runtime(),steps=[];Object.assign(f,{animating:true,lastFrame:0,environmentTime:0,psychedelicTime:0,rigTime:0,bodyTime:0,patternTime:0,modelYaw:0,auto:false,requestAnimationFrame(){},render(){},tickViewer(){},stepBiomeSystem:(bio,elapsed,speed)=>steps.push({bio,elapsed,speed}),ambientSense:{active:false,onsetSerial:0,biomeSerial:0,motionFactor:()=>1,response:()=>({impact:0})}});
 f.tickBackgroundCycle=()=>{};f.tickStarNursery=()=>{};f.stepSuspension=()=>{};f.adoptDetailUpgrade=()=>false;f.spec={biome:{name:'source'},genome:{}};f.v.morph={target:{biome:{name:'target'}}};f.$('motionSpeed').value='100';f.$('bodySpeed').value='100';
 vm.runInContext(src.slice(src.indexOf('let framesInWindow='),src.indexOf('function close(){')),f);f.frame(16);
 assert.equal(steps.length,2);assert.equal(steps[0].bio.name,'source');assert.equal(steps[1].bio.name,'target');assert.equal(steps[0].elapsed,steps[1].elapsed);assert.equal(steps[0].speed,steps[1].speed);
});

test('Worker builds only native B mesh and bounding sphere without freezing main thread',{timeout:30000},async t=>{
 const {Worker}=require('node:worker_threads'),crypto=require('node:crypto');
 const request=vm.runInContext(`(()=>({record:{seed:571938,genome:makeFounderGenome(571938,0,3)},settings:{variance:.75,density:.84,micro:.75}}))()`,ctx);
 const before=JSON.stringify(request);
 const script="const {parentPort}=require('node:worker_threads');const self={postMessage:(value,transfer)=>parentPort.postMessage(value,transfer)};"+ctx.viewerWorkerSource(core)+";parentPort.on('message',data=>self.onmessage({data}));";
 const worker=new Worker(script,{eval:true});let ticks=0;const interval=setInterval(()=>ticks++,2);
 try{
  const message=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage(request)});
  assert.equal(message.ok,true,message.message);assert.ok(ticks>=5);
  ctx.transitionRequest=structuredClone(request);const direct=vm.runInContext('buildViewerTransition(transitionRequest)',ctx);
  const hash=a=>crypto.createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
  assert.equal(hash(message.payload.targetMeshes.shell.data),hash(direct.targetMeshes.shell.data));
  assert.ok(message.payload.bounds.radius>=1);
  assert.equal('batches' in message.payload,false);
  assert.equal('from' in request,false);assert.equal(JSON.stringify(request),before);
  t.diagnostic('Native B worker ready after '+ticks+' event-loop ticks');
 }finally{clearInterval(interval);await worker.terminate()}
});
test('camera handoff adopts native geometry once at end of view transition',()=>{
 const {f,workers,events}=runtime(),original=f.meshes;f.startViewerMorph();const target=deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();assert.equal(f.v.morph.mode,'camera-pan');assert.equal(f.meshes,original);
 for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);assert.equal(f.spec,target);assert.ok(!f.v.phaseFade,'fog transition must remain inactive');
 assert.equal(events.filter(e=>e==='apply').length,1);
});
test('boot screen uses progress bar only, without a rotating spinner',()=>{
 assert.doesNotMatch(html,/boot-dna|bootDnaSpin|morphospaceBootDNAComplete/);
 assert.match(html,/id="bootStatus">読み込み中…/);
 assert.match(html,/class="boot-progress"/);
});



test('cilia shader must not link organism-only phase varyings',()=>{
 assert.match(html,/const ciliaFragment=srcFrag/);
 assert.match(html,/const ciliaProgram=linked\(cv,ciliaFp,'繊毛GPUプログラム'\)/);
 assert.match(html,/replace\(\/uniform float uPhaseCut;varying/);
 assert.match(html,/const program=linked\(vp,fp,'本体GPUプログラム'\)/);
});

test('detailed observation renders external organs and cilia at nonzero skin transparency',()=>{
 const draw=html.slice(html.indexOf('function drawCopy(model,mirrored=false,glassPass=false,copyIndex=0)'),html.indexOf('const pose=wholeBodyPose(bodyTime,spec.seed',html.indexOf('function drawCopy(model,mirrored=false,glassPass=false,copyIndex=0)')));
 assert.ok(draw.includes("if(!debugShell&&!debugGlass)for(const pt of (useLocal?meshes.localParts:meshes.parts))"),'external organs must remain visible when glassAmount > 0');
 assert.ok(draw.includes("if(!debugShell&&!debugGlass)drawGPUMotileCilia(mvp,model,false)"),'surface cilia must remain visible when glassAmount > 0');
 assert.doesNotMatch(draw,/!debugShell&&!debugGlass&&!glassAmount/,'skin transparency must never suppress appendages');
});

test('ecology DNA forms coherent appendage groups with bounded counts and GPU waves',()=>{
 assert.match(html,/function appendageEcology\(/);
 assert.match(html,/g\.ecologyDNA=appendageEcology\(g,seed\)/);
 assert.match(html,/const maxCount=Math\.min\(50,/);
 assert.match(html,/const count=4\+Math\.floor\(rng\(\)\*\(maxCount-3\)\)/);
 for(const plan of ['oral_crown','rim_crown','dorsal_rows','paired_poles','lateral_frill'])assert.ok(html.includes(plan));
 assert.match(html,/const plan=ecology\.appendagePlan,groupCount=/);
 // Five habits (threads, beaded threads, arms, squid, mixed) and unequal spacing around the ring.
 assert.match(html,/const habit=habitRoll<\.30\?'thread':habitRoll<\.44\?'beaded':habitRoll<\.66\?'arm':habitRoll<\.82\?'squid':'mixed';/);
 assert.match(html,/const gaps=Array\.from\(\{length:groupCount\},\(\)=>\.30\+1\.70\*Math\.pow\(vr\(\),1\.7\)\)/);
 assert.doesNotMatch(html,/theta=TAU\*\(i\+\.5\)\/\(groupCount\|\|1\)/,'no equal angular steps');
 assert.match(html,/out\.push\(\{mesh:makeSwept/);
 assert.match(html,/delicate:\{root,phase,rows:segments\+1,sides,type:'strand',form,active:thick,order:i,orderCount:groupCount,dir:outward,length:strandLength,collarLength,collarRadius:thickness\*\(thick\?1\.25:1\.6\)\}/);
 // Fins were removed (v15.87.0); drifting species grow no appendages and strands move on the CPU.
 assert.match(html,/if\(ecology\.appendagePlan==='lateral_frill'\)return out;/);
 assert.doesNotMatch(html,/delicateWave|mode==='fin'|type:'fin'/);
});

test('delicate organs attach inside the detailed implicit growth surface',()=>{
 assert.match(html,/function anchorOnGrowthSurface\(source,origin,direction,expectedRadius\)/);
 assert.match(html,/morphSDF\(origin\[0\]\+dir\[0\]\*t,origin\[1\]\+dir\[1\]\*t,origin\[2\]\+dir\[2\]\*t,source\)/);
 assert.match(html,/const root=anchorOnGrowthSurface\(source,origin,outward,radius\)\|\|anchorOnGrowthSurface\(source,blob\.p,outward,radius\)/);
 assert.match(html,/if\(!root\)continue;/,'a ray that misses the body grows nothing');
 // Behaviour: the root lies on the outermost skin of the ray and is buried inside solid tissue.
 const a=html.indexOf('function anchorOnGrowthSurface'),src=html.slice(a,html.indexOf('function makeDelicateMorphOrgans',a));
 const Vx={add:(p,q)=>p.map((v,i)=>v+q[i]),scale:(p,s)=>p.map(v=>v*s),norm:p=>{const l=Math.hypot(...p)||1;return p.map(v=>v/l)}};
 // Two separate balls on the x axis (radius .5 at x=0 and radius .3 at x=1.5).
 const sdf=(x,y,z)=>Math.min(Math.hypot(x,y,z)-.5,Math.hypot(x-1.5,y,z)-.3);
 const anchor=new Function('V','clamp','morphSDF',src+'return anchorOnGrowthSurface;')(Vx,(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),(x,y,z)=>sdf(x,y,z));
 const far=anchor({bound:2},[0,0,0],[1,0,0],.5);
 assert.ok(far[0]>1.5&&far[0]<1.8&&sdf(...far)<-.012,'outermost skin, buried: '+far);
 const up=anchor({bound:2},[0,0,0],[0,1,0],.5);
 assert.ok(up[1]>.3&&up[1]<.5&&sdf(...up)<-.012,'buried under the skin: '+up);
 assert.equal(anchor({bound:2},[0,3,0],[0,1,0],.5),null,'pointing away from the body: no root');
});

test('growth collars are fused into the source SDF before detailed skin tessellation',()=>{
 assert.match(html,/if\(em\.appendageBases\)for\(const base of em\.appendageBases\)/);
 assert.match(html,/acc=Math\.min\(acc,bd\)-h\*h\*k\*\.25/);
 assert.match(html,/const producedAppendages=low\?\[\]:makeDelicateMorphOrgans\(source,g,palette,seed,detailDensity\)/);
 assert.match(html,/const safeAppendages=safeSpecimenAppendages\(em,producedAppendages,seed\)/);
 assert.match(html,/const delicateParts=safeAppendages\.parts/);
 assert.match(html,/source\.appendageBases=delicateParts\.map/);
 assert.match(html,/if\(localShell\)localParts\.push\(\.\.\.delicateParts(?:,|\))/);
 assert.ok(html.indexOf('const safeAppendages=safeSpecimenAppendages(em,producedAppendages,seed)')<html.indexOf('source.appendageBases=delicateParts.map'));
 assert.ok(html.indexOf('source.appendageBases=delicateParts.map')<html.indexOf('localShell=morphImplicitMesh(source,palette,g,false,n)'));
});

test('delicate strands use real bounded Verlet constraints and body inertia',()=>{
 assert.match(html,/function makeVerletStrand\(mesh,d,genome\)/);
 assert.match(html,/function stepVerletStrand\(mesh,time,moving\)/);
 assert.match(html,/const steps=Math\.max\(1,Math\.min\(4,Math\.ceil\(elapsed\//);
 assert.match(html,/const correction=V\.scale\(diff,error\*/);
 assert.match(html,/const pose=sample\(time\),minus=sample\(time-h\),plus=sample\(time\+h\)/);
 assert.match(html,/gl\.bufferSubData\(gl\.ARRAY_BUFFER,0,mesh\.data\)/);
 assert.match(html,/mesh\.verlet=makeVerletStrand\(mesh,d,sp\.genome\)/);
 assert.match(html,/stepWorldStrand\(mesh,model,bodyTime,strandMotion,strandFreedom,strandGuided,strandJointRef\(mesh,currentJointRig\)\)/);
 assert.match(html,/const strandMotion=\$\('motion'\)\.checked&&!nanoAction&&!captureShareIsOpen&&!strandGuided/);
 assert.match(html,/function strandLocalPoint\(m,p\)/);
 assert.match(html,/function strandCopyMesh\(pt,index\)/);
});

test('underwater strands have free curvature, stronger drift and persistent inertia',()=>{
 const start=html.indexOf('function stepVerletStrand('),end=html.indexOf('function dynamicBatches(',start);
 assert.ok(start>=0&&end>start);
 const solver=html.slice(start,end);
 assert.match(solver,/drag=\.992-\.012\*u/);
 assert.match(solver,/Math\.sin\(phase\*\.83-u\*7\.2\+a\*2\.1\+p\.phase\)\*2\.2\*u/);
 assert.match(solver,/const linear=\['x','y','z'\]\.map\(accel\),angular=/);
  assert.match(solver,/const localAcceleration=localNow\.map/);
  assert.match(solver,/centripetal=cross\(spin,cross\(spin,lever\)\)/);
  assert.match(solver,/clamp\(v-linear\[a\]\*2\.4-localAcceleration\[a\]\*2-euler\[a\]\*1\.8-centripetal\[a\]\*1\.35,-12,12\)/);
 assert.match(solver,/No Laplacian straightening/);
 assert.doesNotMatch(solver,/p\.points\[i-1\]\[a\]\+p\.points\[i\+1\]\[a\]/);
});

test('strand length is bounded by body size and long flexible roots stay pinned',()=>{
 assert.match(html,/const bodySize=Math\.max\(\.3,bodyExtent\*2\)/);
 assert.match(html,/Math\.max\(bodySize\/5,Math\.min\(allowLongTentacles\?bodySize\*2\.5:bodySize\*\.79,length\)\)/);
 assert.match(html,/Math\.max\(form==='beaded'\?20:12,Math\.min\(24,/);
 assert.match(html,/if\(form==='arm'\)strandLength=bodySize\*clamp\(\.50\+\.55\*lengthRoll,\.5,allowLongTentacles\?1\.35:\.95\);/);
 assert.match(html,/else if\(form==='club'\)strandLength=bodySize\*clamp\(1\.05\+\.75\*lengthRoll,1\.05,allowLongTentacles\?1\.9:1\.35\);/);
 assert.match(html,/p\.points\[0\]=anchor\.slice\(\)/);
 assert.match(html,/p\.points\[i\]=V\.add\(p\.points\[i-1\],V\.scale\(direction,p\.lengths\[i-1\]\)\)/);
});

test('tentacle stiffness fades gradually from the rooted insertion with specimen-specific firmness',()=>{
 assert.match(html,/growthDirection:axis/);
 assert.match(html,/rootDecay:1\.5\+\(\(genome\?\.seed\|\|1\)\%991\)\/991\*7\.0/);
 assert.match(html,/const stiffness=Math\.max\(strandBendStiffness\(p,u\),1\/\(1\+p\.rootDecay\*u\*12\)\*\.35\)/);
 assert.match(html,/p\.points\[i\]=V\.add\(p\.points\[i-1\],V\.scale\(direction,p\.lengths\[i-1\]\)\)/);
 assert.match(html,/const direction=V\.norm\(V\.add\(V\.scale\(guide,stiffness\),V\.scale\(segment,\(1-stiffness\)\/length\)\)\)/);
 assert.match(html,/const force=flow\.map\(\(v,a\)=>clamp\(/);
});

test('tentacles start with a curved physical pose',()=>{
 assert.match(html,/Start already immersed in the flow/);
 assert.match(html,/const offset=V\.add\(V\.scale\(lateral,amp\*Math\.sin/);
 assert.match(html,/growthDirection:axis/);
});

test('tentacle angle diversity narrows, never widens, the established fan',()=>{
 assert.match(html,/const spread=\.38\+\.62\*rng\(\)/);
 assert.match(html,/V\.scale\(radial,\.85\*spread\*\(1\+\.5\*jitter\(\)\)\)/);
 assert.match(html,/V\.scale\(radial,\.68\*spread\*\(1\+\.5\*jitter\(\)\)\)/);
 assert.match(html,/V\.scale\(side,lane\*\.35\*spread\*\(1\+\.9\*jitter\(\)\)\)/);
 assert.match(html,/Math\.max\(bodySize\/5,Math\.min\(allowLongTentacles\?bodySize\*2\.5:bodySize\*\.79,length\)\)/);
});

test('camera exit and entry ease independently without freezing the moving background',()=>{
 const travel=t=>ctx.cameraHandoffTravel(t);
 const speed=t=>(travel(t+.0001)-travel(t-.0001))/.0002;
 assert.ok(Math.abs(travel(.5)-.5)<1e-10,'native swap stays exactly at half travel');
 assert.ok(Math.abs(travel(1)-1)<1e-10);
 for(let t=.0002;t<.999;t+=.01)assert.ok(speed(t)>.4,'ambient camera must never stop');
 assert.ok(speed(.25)>speed(.02)*1.3,'A exit must ease in');
 assert.ok(speed(.75)>speed(.98)*1.3,'B arrival must ease out');
 assert.ok(speed(.5)<speed(.25),'the offscreen boundary must be eased, not rushed');
 for(let t=.01;t<.5;t+=.03){
  assert.ok(Math.abs((travel(.5)-travel(.5-t))-(travel(.5+t)-travel(.5)))<1e-8,
   'A/B velocity must remain mirrored across the native swap');
 }
});
test('camera keeps the orbit axis through B arrival, then changes it after settling',()=>{
 const {f,workers}=runtime();let turns=0;
 f.cameraOrbitChooseHeading=()=>{turns++};
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 m.elapsed=m.exitDuration+m.warpDuration*.81;f.tickViewer(.01);
 assert.equal(turns,0,'no new rotation axis during B approach');
 m.elapsed=m.exitDuration+m.warpDuration-.005;f.tickViewer(.01);
 assert.equal(f.v.morph,null,'B acquisition must complete');
 assert.equal(turns,0,'acquisition frame must preserve the previous orbit axis');
 assert.equal(f.v.orbitHeadingPending,true);
 assert.ok(f.v.orbitHeadingDelay>=1.1);
 for(let i=0;i<9;i++)f.tickViewer(.12);
 assert.equal(turns,0,'the orbit stays stable for at least a second after arrival');
 for(let i=0;i<3;i++)f.tickViewer(.12);
 assert.equal(turns,1,'choose a new angular-velocity target only after the landing delay');
 for(let i=0;i<6;i++)f.tickViewer(.12);
 assert.equal(turns,1,'never reselect the axis each frame');
});
test('remote warp preserves A until frameout, accelerates toward fixed distant B and rebases at capture',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();const target=deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 assert.equal(m.warpChase,true);
 assert.ok(Math.hypot(...Array.from(m.warpTarget))>=m.fromDistance*6);
 assert.equal(m.warpAmount,0);
 const anchor=Array.from(m.warpTarget);
 for(let i=0;i<Math.floor(m.exitDuration*.75/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec.seed,1,'source remains visible until fully outside frame');
 assert.equal(m.switched,false);
 for(let i=0;i<Math.ceil((m.exitDuration*.25+.40)/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec,target,'remote B activates only after source leaves the frame');
 assert.equal(m.switched,true);
 assert.equal(m.warpStage,'accel');
 for(let i=0;i<6;i++)f.tickViewer(.12);
 assert.ok(m.warpAmount>.1,'visible star-trail energy rises with warp speed');
 for(let i=0;i<Math.ceil(m.warpDuration/.12)+4&&f.v.morph;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
 for(let i=0;i<3;i++)assert.ok(Math.abs(f.v.worldOffset[i]-anchor[i])<1e-6);
});
test('quintic warp easing accelerates and brakes smoothly without positional jumps',()=>{
 const {f}=runtime();
 const u=x=>f.warpChaseEase(x);
 assert.equal(u(0),0);assert.equal(u(1),1);assert.equal(u(.5),.5);
 for(let p=.01;p<=1;p+=.01)assert.ok(u(p)>=u(p-.01)-1e-10);
 const speed=p=>(u(p+.001)-u(p-.001))/.002;
 assert.ok(speed(.5)>speed(.10)*10);
 assert.ok(speed(.5)>speed(.90)*10);
});
test('warp keeps ordinary star point rendering without streak bands',()=>{
 assert.doesNotMatch(html,/const warpTrailVertex=/);
 assert.doesNotMatch(html,/drawWarpStarTrails\(aspect\)/);
 assert.doesNotMatch(html,/vWarpAmount\*streak/);
 assert.match(html,/gl_PointSize=mix\(5\.5/);
});

test('warp-flight gaze banks in three axes and settles at acquisition',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 m.warpStage='frameout';
 m.elapsed=0;
 assert.ok(Array.from(f.warpFlightAngles(m)).every(v=>Math.abs(v)<1e-12),
  'initial warp rotation must be numerically zero (including signed zero)');
 m.elapsed=m.exitDuration*.7;
 assert.ok(Math.abs(f.warpFlightAngles(m)[0])>.05,
  'sky begins rotating before A has finished exiting');
 m.elapsed=m.exitDuration+m.warpDuration*.5;
 const angles=Array.from(f.warpFlightAngles(m));
 assert.ok(Math.abs(angles[0])>.7,'wide yaw must move the infinite-distance sky');
 assert.ok(Math.abs(angles[1])>.025,'pitch must make the gaze genuinely three dimensional');
 assert.ok(Math.abs(angles[2])>.05,'banking roll must be visible during the overlapped transition');
 f.warpChaseState(m,0);
 assert.ok(Math.abs(m.warpPosition[2])>1,'trajectory must bend through depth, not just screen XY');
 m.elapsed=m.exitDuration+m.warpDuration;
 const finalAngles=Array.from(f.warpFlightAngles(m));
 assert.ok(Math.abs(finalAngles[0])>1.7,'destination sky must differ substantially from source A');
 assert.ok(Math.abs(finalAngles[1])>.05,'destination should also differ in elevation');
 assert.ok(Math.abs(finalAngles[2])<1e-7,'temporary banking roll must finish level');
 assert.ok(Math.abs(m.warpYaw)>=100*Math.PI/180&&Math.abs(m.warpYaw)<=150*Math.PI/180,
  'each handoff must target a random distant sky sector');
});
test('B is born at the optical centre and eases into a camera-aligned full-size specimen',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph,total=m.exitDuration+m.warpDuration;
 assert.equal(m.entryBirthX,undefined);
 assert.equal(m.entryBirthY,undefined);
 m.elapsed=total*.59;
 assert.equal(f.warpEntryFrame(m).visible,false,'B stays invisible immediately after geometry swap');
 m.elapsed=total*.60;
 const born=f.warpEntryFrame(m);
 assert.equal(born.visible,true);
 assert.ok(born.scale<.006,'B enters as a near-point');
 assert.equal(born.x,0);assert.equal(born.y,0);
 m.elapsed=total*.85;
 const growing=f.warpEntryFrame(m);
 assert.ok(growing.scale>born.scale&&growing.scale<1);
 assert.equal(growing.x,0);assert.equal(growing.y,0);
 m.elapsed=total;
 const done=f.warpEntryFrame(m);
 assert.equal(done.scale,1);
 assert.equal(done.x,0);assert.equal(done.y,0);
 assert.equal(done.focus,1);
 m.elapsed=total*.79;
 assert.equal(f.warpEntryFrame(m).focus,0,'B begins at the optical centre until its early-settling phase');
 m.elapsed=total*.85;
 const settling=f.warpEntryFrame(m);
 assert.ok(settling.focus>0&&settling.focus<1,'world-anchor alignment starts during visible growth');
 m.elapsed=total*.95;
 const late=f.warpEntryFrame(m);
 assert.ok(late.focus>settling.focus&&late.focus<1,'the final approach continues smoothly rather than jumping late');
 const nearEdge=(a,b)=>Math.abs(a-b)<1e-9;
 m.elapsed=total*.80;
 assert.ok(nearEdge(f.warpEntryFrame(m).focus,0),'alignment starts with zero displacement');
 m.elapsed=total;
 assert.ok(nearEdge(f.warpEntryFrame(m).focus,1),'alignment finishes at the exact world anchor');
 // Camera flight must settle before the main visible B alignment:
 // the reveal begins at overall .80, equivalent to warp progress .544.
 assert.match(src,/const flight=clamp\(p\/\.72,0,1\)/);
 assert.match(src,/const u=warpChaseEase\(flight\)/);
 assert.match(src,/const bend=Math.pow\(Math.sin\(Math.PI\*flight\),2\)/);
 assert.match(src,/const opticalCentre=eye.position.map\(\(v,i\)=>v-eye.back\[i\]\*depth\)/);
 assert.match(src,/const centre=opticalCentre.map\(\(v,i\)=>v\+\(anchor\[i\]-v\)\*birth.focus\)/);
 assert.match(src,/Math.max\(spec.viewDistance,\(m.targetBounds\?\.radius\|\|0\)\*1\.15\)/);
 assert.doesNotMatch(src,/const projectedScale=Math\.min/);
 assert.match(src,/m.entryYaw=modelYaw;m.entryPitch=modelPitch;m.entryRoll=cameraRoll/);
 assert.match(src,/entryPositionWorld=true/);
 // B's tentacles now receive a progressive, bounded guided sway instead
 // of the earlier all-or-nothing lock during the approach.
 assert.match(src,/const strandFreedom=enteringB\?handoffEase\(\(entryProgress-\.64\)\/\.36\):1/);
 assert.match(src,/const strandGuided=!!enteringB/);
 assert.match(src,/const strandMotion=\$\('motion'\)\.checked&&!nanoAction&&!captureShareIsOpen&&!strandGuided/);
 assert.match(src,/stepWorldStrand\(mesh,model,bodyTime,strandMotion,strandFreedom,strandGuided,strandJointRef\(mesh,currentJointRig\)\)/);
 assert.match(src,/p\.worldPoints=p\.rest\.map\(restWorld\)/);
 assert.match(src,/const toDistance=Math.max\(job.distance\*viewer.fit\*zoom,targetBounds.radius\*1\.15\)/);
});
test('B aligns its swimming heading during entrance and eases only its travel translation afterward',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 for(let i=0;i<Math.ceil((m.exitDuration+m.warpDuration)/.12)+3&&f.v.morph;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
 assert.equal(f.v.arrivalPoseTime,1.4,'the final reveal and normal pose must share the same travel offset');
 f.tickViewer(.12);
 assert.equal(f.v.arrivalPoseTime,1.4);
 assert.match(src,/pulseAlignRotation\(posed,pulseTravel.direction,1,true\)/);
 assert.doesNotMatch(src,/pulseAlignRotation\(posed,pulseTravel.direction,arrivalBlend\)/);
 assert.match(src,/translate3\(\.\.\.pulseTravel.position.map\(v=>v\*arrivalBlend\)\)/);
 for(let i=0;i<15;i++)f.tickViewer(.12);
 assert.equal(f.v.arrivalPoseTime,1.4);
});
test('warp lens eases into ultra-wide perspective and returns to the original observation FOV',()=>{
 const {f,workers}=runtime();f.startViewerMorph();deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph,at=p=>{m.elapsed=p*(m.exitDuration+m.warpDuration);return f.warpCameraFovDegrees(m)};
 m.warpStage='frameout';assert.equal(at(0),43);
 assert.ok(at(.20)>43&&at(.20)<112,'wide-angle begins before A exits');
 assert.ok(Math.abs(at(.40)-112)<1e-8,'A is still present at full wide-angle');
 assert.ok(Math.abs(at(.58)-112)<1e-8);
 assert.ok(at(.80)>43&&at(.80)<112);
 assert.ok(Math.abs(at(1)-43)<1e-8);
 assert.match(html,/persp\(warpCameraFovDegrees\(viewer\.morph\)\*Math\.PI\/180/);
 assert.match(html,/uniform float uResidentTanHalfFov;/);
 assert.match(html,/uniform float uBgTanHalfFov;/);
});

test('tentacle koshi: half way between the firm and the limp root, no spring-back',()=>{
 const vm=require('node:vm'),a=html.indexOf('function strandKoshi');const src=html.slice(a,html.indexOf('// Tentacles are muscular',a));
 const V={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),scale:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)}};
 const f={Math,V,clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))};vm.createContext(f);vm.runInContext(src+';this.k=strandKoshi;this.s=strandBendStiffness;this.relax=strandBendRelax;',f);
 for(let seed=1;seed<400;seed++){
  const p={genome:{seed},phase:1},k=f.k(p);
  assert.ok(k.root>=.21&&k.root<=.36,'half way back: '+k.root);
  const prof=[...Array(21)].map((_,i)=>f.s(p,i*.05));
  for(let i=1;i<prof.length;i++)assert.ok(prof[i]<=prof[i-1]+1e-9);
  assert.ok(prof[1]>k.root*.5,'some body just past the root');
  assert.ok(f.s(p,.5)<.03&&f.s(p,.7)<.002,'soft as a ribbon beyond the root region');
 }
 // No shape memory: a strand bent sideways and left alone does not spring back toward a coil,
 // and the correction adds no momentum (previous positions move with it).
 const rows=12,p={genome:{seed:1},phase:1,koshi:{firm:.5,root:.42,hold:.04,decay:.11}};
 const rest=[...Array(rows)].map((_,i)=>[0,i*.1,0]),lengths=Array(rows-1).fill(.1);
 const pts=rest.map((q,i)=>[Math.sin(i*.4)*.03*i,q[1],0]),prev=pts.map(q=>q.slice());
 const tipBefore=pts.at(-1).slice();f.relax(pts,rest,lengths,p,1/60,prev);
 for(let i=0;i<rows;i++)assert.ok(Math.hypot(...V.sub(V.sub(pts[i],prev[i]),[0,0,0]))<1e-9,'no velocity injected');
 assert.ok(Math.hypot(...V.sub(pts.at(-1),tipBefore))<.06,'the tip is not yanked back');
 assert.match(html,/strandBendRelax\(p\.worldPoints,p\.rest\.map\(restWorld\),p\.lengths,p,dt,p\.worldPrevious\)/);
 assert.match(html,/const push=p\.active\?\.22:STRAND_CURRENT,drift=p\.active\?0:STRAND_OUTWARD_DRIFT;/);assert.match(html,/\(fluid\[k\]\*push\+axis\[k\]\*drift\)\*dt\*dt/);
 assert.match(html,/STRAND_ROOT_SPRING=1\.5,STRAND_OUTWARD_DRIFT=\.26,STRAND_CURRENT=1\.55;/);
 // The current travels down the thread instead of pushing it as one rod.
 assert.match(html,/Math\.sin\(phase\*\.51\+p\.phase-u\*4\.4\)/);
 assert.doesNotMatch(html,/V\.scale\(axis,\.57\)/,'the root is a spring, not a lock');
});

test('the morphing transition fuses the copies into the base part without moving the camera',()=>{
 // The body is drawn as one base part repeated per copy transform, so the fuse is a
 // model-matrix interpolation: no mesh is rebuilt and no camera travel is inserted,
 // which is what lets the background keep scrolling through the transition.
 assert.ok(src.includes("const MORPH_TRANSITION=true"),'morphing must be the default transition');
 assert.ok(src.includes("if(MORPH_TRANSITION&&fuseTransitionReady(spec,job.target)){"));
 assert.ok(src.includes("viewer.morph={mode:'fuse',stage:'fuse',elapsed:0,t:0,"));
 // Legacy specimens carry a preassembled shell with no copies and must fall back.
 assert.ok(src.includes("return copies(source)>=2&&copies(target)>=2;"));
 // No camera fields: the fuse must not borrow the warp's travel or world offset.
 const setup=src.slice(src.indexOf("viewer.morph={mode:'fuse'"),src.indexOf("const rect=canvas.getBoundingClientRect()"));
 for(const field of ['warpStart','warpTarget','travelAxis','travelDistance','exitDistance','warpChase'])
  assert.ok(!setup.includes(field),'the fuse must not carry '+field);
 assert.ok(src.includes("if(fuseMorphState(m,dt))cancelViewerMorph(true);"));
 // The camera-pan commit shifts the world offset by its travel; the fuse must not,
 // or the next specimen would be displaced by a transition that never moved.
 assert.ok(src.includes("if(commit&&m.mode==='camera-pan')for(let i=0;i<3;i++)"));
});

test('copies are absorbed in sequence and come back in sequence',()=>{
 const state=(fuse,count)=>Array.from({length:count},(_,i)=>{
  const span=.52,window=1-span;
  const start=i===0?0:(i-1)/Math.max(1,count-1)*span;
  const x=Math.max(0,Math.min(1,(fuse-start)/Math.max(.01,window)));
  return x*x*x*(x*(x*6-15)+10);
 });
 const count=6;
 // Mid-collapse the copies must be at different stages, otherwise the whole body
 // implodes at once instead of merging part by part.
 const mid=state(.5,count);
 assert.ok(mid[1]>mid[count-1]+.2,'earlier copies must merge before later ones: '+mid.map(v=>v.toFixed(2)));
 assert.ok(state(1,count).every(v=>v>.999),'every copy must be fully merged at the end');
 assert.ok(state(0,count).every(v=>v<.001),'nothing may be merged at the start');
 // The timeline runs fuse, hold, then defuse, and the specimen is swapped while the
 // single fused part is on screen - never while the copies are visible.
 const tick=src.slice(src.indexOf('function fuseMorphState('),src.indexOf('function warpHandoffGlow('));
 assert.ok(tick.includes("m.stage='fuse';m.fuse=clamp(m.elapsed/m.fuseDuration,0,1);"));
 assert.ok(tick.includes("m.stage='hold';m.fuse=1;"));
 assert.ok(tick.indexOf("m.switched=true;spec=m.target")>tick.indexOf("m.stage='hold'"),'the swap must happen during the hold');
 assert.ok(tick.includes("m.stage='defuse';m.t=1;"));
 assert.ok(tick.includes("m.fuse=1-clamp((m.elapsed-m.fuseDuration-m.holdDuration)"),'the defuse must run the fuse backwards');
});

// Driving the whole fuse timeline: the state machine was correct but the camera read
// spec.viewDistance every frame, and the specimen arriving from the Worker has none,
// so the projection went NaN at the swap and the body vanished for the rest of the
// transition. Keep the distance finite and continuous from the first tick to commit.
test('the fuse transition keeps the view distance finite from the swap to the commit',()=>{
 const {f,workers}=runtime();
 const ev=code=>vm.runInContext(code,f);
 const copies=n=>Array.from({length:n},(_,i)=>({p:[i*2-2,0,0],scale:1,angle:.3*i,axis:'y',mirror:i%2===1,mirrorY:false}));
 const group=n=>({shell:mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]),parts:[],source:{blobs:[{p:[0,0,0],axes:[1,1,1]}]},copyTransforms:copies(n)});
 const model=n=>({copyLayout:0,copyTransforms:copies(n),fusedSource:{blobs:[{p:[0,0,0],axes:[1,1,1]}]}});
 f.spec.growthModel=model(5);f.spec.localGroup=group(5);f.meshes.localShell=f.spec.localGroup.shell;
 const from=f.spec.viewDistance;
 f.startViewerMorph();
 const target={seed:2,style:0,genome:{},parts:[],rigs:[],palette:{},growthModel:model(4),localGroup:group(4)};
 const tile=mesh([[0,0,1],[2,0,1],[0,2,1]],[0,1,2]);
 workers[0].onmessage({data:{ok:true,payload:{target,distance:15,
  targetMeshes:{shell:tile,parts:[],cilia:[],localShell:tile,localParts:[]},bounds:{radius:5}}}});
 f.advanceViewerPreparation();
 if(ev('viewer.preparing')&&ev('viewer.pending&&viewer.pending.ready'))f.activateViewerPreparation();
 assert.equal(ev('viewer.morph&&viewer.morph.mode'),'fuse','a specimen built from copies must morph, not pan');
 const stages=[];let swapStage=null,previous=from;
 for(let i=0;i<80&&ev('viewer.morph');i++){
  f.tickViewer(.1);
  const m=ev('viewer.morph');
  assert.ok(Number.isFinite(f.spec.viewDistance),'view distance went undefined, which makes the camera NaN');
  // Monotone and continuous: no jump that would read as a cut.
  assert.ok(Math.abs(f.spec.viewDistance-previous)<Math.abs(from-15)*.5+1e-6,'the view distance must not jump');
  previous=f.spec.viewDistance;
  if(m){stages.push(m.stage);if(m.switched&&swapStage===null)swapStage=m.stage;}
 }
 assert.equal(ev('viewer.morph'),null,'the transition must finish');
 assert.equal(f.spec,target,'the next specimen must be live at the end');
 assert.equal(swapStage,'hold','the specimen must be swapped while the single fused part is on screen');
 assert.deepEqual([...new Set(stages)],['fuse','hold','defuse'],'all three stages must run in order');
 // The commit sets the final distance; it must agree with the value the easing reached.
 assert.ok(Math.abs(f.spec.viewDistance-previous)<.5,'the commit must not snap the framing');
});

test('tentacles retract in a scattered order and are fully gone when the copies merge',()=>{
 const {f}=runtime();
 f.seedRng=ctx.seedRng;
 const retract=vm.runInContext('tentacleRetraction',f);
 const row=(seed,amount,count=10)=>Array.from({length:count},(_,i)=>retract(seed,i,amount));
 // Nothing retracted before the fuse starts, everything gone once the copies have
 // merged: a tentacle left on the single fused part would look like a mistake.
 assert.ok(row(733117,0).every(v=>v===1),'tentacles must be intact at the start');
 for(const seed of [1,99,733117,2654435761])
  assert.ok(row(seed,1,40).every(v=>v<1e-6),'every tentacle must be gone by the end, seed '+seed);
 // Scattered, not synchronised: mid-fuse the parts must be at clearly different stages.
 const mid=row(733117,.5,12);
 assert.ok(Math.max(...mid)-Math.min(...mid)>.4,'retraction must be staggered: '+mid.map(v=>v.toFixed(2)));
 // Monotone, so the regrowth on the way back out never stutters.
 for(let i=0;i<6;i++){
  let previous=1;
  for(let a=0;a<=1.0001;a+=.05){const v=retract(733117,i,a);assert.ok(v<=previous+1e-9,'retraction must not reverse');previous=v;}
 }
 // Different specimens retract in different orders.
 const a=row(11,.5,12).map(v=>v.toFixed(2)).join(),b=row(12,.5,12).map(v=>v.toFixed(2)).join();
 assert.notEqual(a,b,'the order must follow the specimen seed');
});

test('only tentacle-like parts retract, and the strand simulation never feels the shrink',()=>{
 const tentacle=vm.runInContext('tentaclePart',runtime().f);
 for(const kind of ['arm','branch','spike'])assert.ok(tentacle({kind,mesh:{}}),kind+' must retract');
 for(const kind of ['opaque','translucent','lung'])assert.ok(!tentacle({kind,mesh:{}}),kind+' must not retract');
 assert.ok(tentacle({kind:'opaque',mesh:{verlet:true}}),'simulated strands must retract whatever their kind');
 // The strand is stepped with the true model matrix and only the draw is retracted;
 // stepping with the shrunken matrix would feed the shrink back into the simulation.
 const draw=src.slice(src.indexOf('function drawCopy(model,mirrored'));
 const step=draw.indexOf('stepWorldStrand(mesh,model,bodyTime'),shrink=draw.indexOf('const retract=fuseAmountForDraw');
 // Parts are keyed by their own geometry, not by a loop counter, so the same specimen
 // retracts its tentacles in the same order every time it is viewed.
 assert.ok(draw.includes('tentacleRetraction(spec.seed,partFuseKey(pt),fuseAmountForDraw)'));
 assert.ok(src.includes('return (pt.__fuseKey=Math.abs(Math.round((c[0]*7919+c[1]*104729+c[2]*1299709)*997))+1);'));
 assert.ok(step>=0&&shrink>step,'the strand must be stepped before the retraction is applied');
 assert.ok(draw.includes('gl.uniformMatrix4fv(u.uModel,false,model);gl.uniformMatrix4fv(u.uMvp,false,mvp);'),'the copy matrices must be restored after a retracted part');
 assert.ok(draw.includes('if(retract<=.02)continue;'),'a fully retracted part must stop being drawn');
});

test('the organism convulses through the transition and settles exactly at both ends',()=>{
 const m={mode:'fuse',elapsed:0,fuseDuration:1.8,holdDuration:.4,defuseDuration:1.8};
 const saved=ctx.viewer;
 try{
  ctx.viewer={morph:null};
  assert.equal(ctx.fuseTremor(),0,'no tremor outside a fuse transition');
  ctx.viewer={morph:{mode:'camera-pan',elapsed:1}};
  assert.equal(ctx.fuseTremor(),0,'the camera handoff must not shake the body');
  ctx.viewer={morph:m};
  const at=e=>{m.elapsed=e;return ctx.fuseTremor()};
  // Nothing at either end: a shudder still running when the next specimen is handed
  // over would look like a bug rather than a transformation.
  assert.equal(at(0),0);
  assert.equal(at(4),0);
  assert.ok(at(1.9)>.999&&at(2.1)>.999,'the tremor must be at full strength while the copies are merged');
  let previous=-1;
  for(let e=0;e<=1.8001;e+=.1){const v=at(e);assert.ok(v>=previous-1e-9,'the tremor must only rise through the fuse');previous=v;}
  previous=2;
  for(let e=2.2;e<=4.0001;e+=.1){const v=at(e);assert.ok(v<=previous+1e-9,'the tremor must only fall through the defuse');previous=v;}
 }finally{ctx.viewer=saved}
 // Cilia are pushed toward the shader's own ceiling; the body is raised but capped,
 // because the shader multiplies uMotion by up to 1.82 and an uncapped value tears skin.
 assert.match(html,/clamp\(uCiliaAmp,0\.,8\.\)/,'the shader must still clamp the beat');
 assert.ok(!html.includes('FUSE_TREMOR_CILIA'),'the transition must leave the cilia beat alone');
 assert.ok(html.includes("gl.uniform1f(v.uCiliaAmp,$('motion').checked?CILIA_MOTION_GAIN*Number($('motionAmp').value)/100:0);"));
 // A sin-based hash degenerates once its argument grows, which made the fray move the
 // whole surface as one. No sin in the hash, and the beat phase is wrapped.
 assert.ok(!/float frayHash\(vec3 p\)\{return fract\(sin/.test(html),'the fray hash must not use sin');
 assert.ok(html.includes('q+=dot(q,q.yzx+33.33);'));
 assert.ok(html.includes('float fast=mod(time*9.3+h*6.2831853,6.2831853);'),'the phase must be wrapped before it is scaled');
 assert.ok(html.includes("Math.min(FUSE_TREMOR_BODY_CAP,(1+FUSE_TREMOR_BODY*fuseTremor())*Number($('motionAmp').value)/100"));
 // Post-multiplied, so the shudder turns the body about its own origin and never
 // slides it off centre.
 assert.ok(html.includes("base=mul4(base,mul4(rotX(Math.sin(t*79.3)*a),mul4(rotY(Math.sin(t*101.7+1.7)*a),rotZ(Math.sin(t*127.1+3.1)*a))));"));
 // The surface frays per vertex: neighbouring vertices of one triangle get independent
 // offsets along the normal, so the skin bristles instead of breathing smoothly. The
 // helper lives in the shared chunk, so both the full and the Safari path get it.
 assert.equal((html.match(/float frayField\(vec3 p,float time\)/g)||[]).length,1,'frayField belongs in the shared chunk');
 assert.ok(html.includes('vec3 wholeBodyWarp(vec3 p,float t,float amp){'),'the shared chunk must still define the body warp');
 assert.equal((html.match(/\$\{wholeBodyGLSL\}/g)||[]).length,3,'both vertex shaders and the cilia pass include the shared chunk');
 assert.ok(html.includes('if(uFray>0.0)shifted+=frayDir(canonical,canonicalNormal)*frayField(canonical,ancestralTime)*uFray;'),'the full path must fray');
 assert.ok(html.includes('if(uFray>0.0)p+=frayDir(jPos,n)*frayField(jPos,uTime)*uFray;'),'the Safari path must fray too');
 assert.equal((html.match(/vec3 frayDir\(vec3 p,vec3 n\)/g)||[]).length,1,'the splay direction belongs in the shared chunk');
 assert.ok(html.includes('return normalize(n*1.35+r+vec3(0.0,1e-4,0.0));'),'the splay must stay biased outward and never normalize a zero vector');
 assert.ok(html.includes("if(u.uFray)gl.uniform1f(u.uFray,FUSE_TREMOR_FRAY*fuseTremor());"));
 // A capture must come out clean, like the motion it already zeroes.
 assert.ok(html.includes("gl.uniform1f(u.uMotion,0);if(u.uFray)gl.uniform1f(u.uFray,0);"));
 assert.ok(html.includes("'uMotion','uFray','uStyle'"),'uFray must be resolved with the other uniforms');
 // fuseTremor is read by the cilia pass, which lives above the viewer, so it must be
 // declared above it too and must survive a context with no viewer at all (the Worker).
 assert.ok(html.indexOf('function fuseTremor()')<html.indexOf('const viewer='),'fuseTremor must be declared before the viewer');
 assert.ok(html.includes("if(typeof viewer==='undefined'||!viewer)return 0;"),'the Worker runs this source without a viewer');
});
