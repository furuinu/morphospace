const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2],core=src.slice(0,src.indexOf("const canvas=$('glview'),gl="));
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(core,ctx);
function mesh(vertices,tri){const data=new Float32Array(vertices.length*17);vertices.forEach((p,i)=>data.set([...p,0,0,1,1,0,0,0,0,0,0,0,0,0,0],i*17));return{data,tri:new Uint16Array(tri),edges:new Uint16Array(tri.flatMap((v,i)=>[v,tri[i-i%3+(i+1)%3]]))}}
const a=mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]),b=mesh([[0,0,1],[2,0,1],[0,2,1],[-2,0,1]],[0,1,2,0,2,3]);
function runtime(){
 const elements={},events=[],workers=[],transfers=[],defaults={variance:75,density:84,micro:75,emitColor:0,emissionStrength:110,emitBlink:1,blinkSpeed:65,bloomRadius:105};let bufferId=0;
 const f={console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),TAU:Math.PI*2,performance:{now:()=>100},document:{hidden:false,createElement:()=>({className:'',hidden:false,setAttribute(){},getContext:()=>null})},spec:{seed:1,style:0,baseViewDistance:10,viewDistance:20},selected:0,activeStoredIndividual:null,busy:false,videoRecording:null,nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,population:[{id:'a',seed:1,genome:{}},{id:'b',seed:2,genome:{}}],meshes:{id:'original',shell:{...a,buffer:'old',triBuffer:'old-tri',lineBuffer:'old-lines'},parts:[],cilia:[]},rigMeshes:[],detailSpecimens:[],detailCacheOrder:[],
  VIEWER_CORE_SOURCE:core,viewerWorkerSource:ctx.viewerWorkerSource,viewerMorphSurfaces:ctx.viewerMorphSurfaces,textureMorphUniforms:ctx.textureMorphUniforms,renderer:{vars:{}},canvas:{width:1120,height:780,getBoundingClientRect:()=>({width:1120,height:780})},modelYaw:0,modelPitch:0,cameraRoll:0,worldCameraFrame:()=>({right:[1,0,0],up:[0,1,0],position:[0,0,20]}),panX:0,panY:0,pulseTravel:{specimen:null,position:[0,0,0],camera:[0,0,0]},transitionSpecimenBounds:ctx.transitionSpecimenBounds,cameraHandoffDistance:ctx.cameraHandoffDistance,cameraHandoffDirection:ctx.cameraHandoffDirection,cameraHandoffDuration:ctx.cameraHandoffDuration,cameraHandoffFrame:ctx.cameraHandoffFrame,CAMERA_HANDOFF_SECONDS:4,CAMERA_HANDOFF_SWITCH:.5375,CAMERA_ORBIT_BASE_SPEED:.0796875,cameraOrbitSpeed:-.0796875,cameraOrbitTargetSpeed:-.0796875,cameraOrbitChooseHeading:()=>{},cameraOrbitAngularSpeed:()=>.0796875,buildEmissionSites:()=>Array.from({length:4},()=>[0,0,0,.3]),getSpecEmissionDNA:()=>({colorMode:0,strength:110,blinkMode:1,blinkSpeed:65,bloomRadius:105}),EMIT_COLORS:[[.2,.8,1]],
  Blob:class{},URL:{createObjectURL:()=> 'blob:worker'},Worker:class{constructor(){workers.push(this)}postMessage(value){this.request=value}terminate(){this.terminated=true}},
  gl:{ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,STATIC_DRAW:3,DYNAMIC_DRAW:4,createBuffer:()=> 'new-'+(++bufferId),bindBuffer(){},bufferData(target,size){events.push('allocate');transfers.push({allocate:size})},bufferSubData(target,offset,data){events.push('upload');transfers.push({bytes:data.byteLength})},deleteBuffer:buffer=>events.push('delete:'+buffer)},
  applyUploadedSpecimen:(sp,preserve,metadata,prepared)=>{assert.ok(prepared);f.spec=sp;f.meshes=prepared.meshes;events.push('apply')},currentIndividual:()=>({name:'original'}),recordDisplayName:r=>r.name,viewerMetadata:()=>events.push('metadata'),viewerPatternValues:()=>new Map(),morphFrameFactors:ctx.morphFrameFactors,interpolateMorphBatch:ctx.interpolateMorphBatch,layeredMorphScale:ctx.layeredMorphScale,interpolateLayeredMorphBatch:ctx.interpolateLayeredMorphBatch,
  $:id=>elements[id]||(elements[id]={open:false,value:String(defaults[id]??0),textContent:'',checked:true,hidden:false,style:{},classList:{toggle(){},add(){},remove(){},contains(){return true}},setAttribute(k,v){this[k]=v}})};
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
 assert.ok(distance>bounds.radius+20*Math.tan(Math.PI*43/360)*1.6);
});
test('short camera sweeps complete faster without interrupting continuous travel',()=>{
 const duration=ctx.cameraHandoffDuration;
 const short=duration(9,20,20),medium=duration(25,20,20),long=duration(75,20,20);
 assert.ok(short>=5&&short<medium&&medium<long);
 assert.ok(long<=42,'large silhouettes still use a measured maximum interval');
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);
 f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph;
 const expected=duration(m.travelDistance,m.fromDistance,m.toDistance);
 assert.ok(Math.abs(m.duration-expected)<1e-8,'animation must use the adaptive time');
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
 for(let i=0;i<Math.floor(f.v.morph.duration*.27/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec.seed,1,'source must still be active before the handoff');
 assert.equal(f.v.morph.switched,false);
 for(let i=0;i<Math.ceil(f.v.morph.duration*.30/.12);i++)f.tickViewer(.12);
 assert.equal(f.spec,target,'target must become visible only after A exits');
 assert.equal(f.v.morph.switched,true);
 assert.equal(f.v.morph.batches.length,0);
 assert.equal(events.filter(e=>e==='upload').length,before,'no dynamic mesh transfer during camera movement');
});
test('cancelling after B becomes active restores original A meshes and view',()=>{
 const {f,workers}=runtime(),source=f.spec,original=f.meshes;
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 for(let i=0;i<Math.ceil(f.v.morph.duration*.55/.12);i++)f.tickViewer(.12);
 assert.equal(f.v.morph.switched,true);
 f.cancelViewerMorph(false);
 assert.equal(f.v.morph,null);assert.equal(f.spec,source);assert.equal(f.meshes,original);
 assert.equal(f.spec.viewDistance,20);
});
test('camera and specimen preserve absolute world location at completion',()=>{
 const {f,workers}=runtime();
 f.startViewerMorph();deliver(f,workers[0]);f.advanceViewerPreparation();f.activateViewerPreparation();
 const m=f.v.morph,axis=m.travelAxis.slice(),distance=m.travelDistance;
 assert.deepEqual(Array.from(f.v.worldOffset),[0,0,0]);
 for(let i=0,steps=f.v.morph?Math.ceil(f.v.morph.duration/.12)+2:35;i<steps;i++)f.tickViewer(.12);
 assert.equal(f.v.morph,null);
 for(let i=0;i<3;i++)assert.ok(Math.abs(f.v.worldOffset[i]-2*distance*axis[i])<1e-6);
 f.stopViewer();
 assert.deepEqual(Array.from(f.v.worldOffset),[0,0,0]);
});
test('camera handoff switches silhouettes while camera maintains forward motion',()=>{
 const source={radius:18},target={radius:25},distance=40,aspect=1.8;
 const travel=ctx.cameraHandoffDistance(source,target,distance,distance,aspect);
 const halfWidth=(distance+target.radius)*Math.tan(Math.PI*43/360)*aspect;
 assert.ok(travel-source.radius>halfWidth);
 assert.ok(travel-target.radius>halfWidth);
 const m={travelDistance:travel,yawSign:1};
 const before=ctx.cameraHandoffFrame(m,.4999),at=ctx.cameraHandoffFrame(m,.5),after=ctx.cameraHandoffFrame(m,.5001);
 assert.equal(before.switched,false);assert.equal(at.switched,true);
 assert.ok(before.travel<at.travel&&at.travel<after.travel);
 const v1=(at.travel-before.travel)/.0001,v2=(after.travel-at.travel)/.0001;
 assert.ok(Math.abs(v1-v2)<1e-5,'camera should not jump in speed on the geometry swap');
});

test('camera pan renders finished body and appendages without layered LOD',()=>{
 assert.ok(src.includes("base=mul4(translate3(...viewer.worldOffset),base)"));
 assert.ok(src.includes("const useLocal=!!(spec.localGroup&&meshes.localShell&&(!viewer.morph||viewer.morph.mode==='camera-pan'))"));
 assert.ok(src.includes("if(viewer.morph?.mode==='camera-pan'&&viewer.morph.switched)"));
 assert.ok(src.includes("viewer.worldOffset[i]+=2*m.travelDistance*m.travelAxis[i]"));
 assert.ok(src.includes("const rawBatches=from.length?createMorphBatches")===false);
});
test('native A and B materials are not blended during offscreen handoff',()=>{
 assert.ok(src.includes("m.mode==='camera-pan'||spec!==m.source"));
 assert.ok(src.includes("viewer.morph.mode!=='camera-pan'&&spec===viewer.morph.source"));
 assert.ok(src.includes("viewer.morph.mode==='camera-pan'"));
 assert.ok(src.includes("if(viewer.morph?.mode==='camera-pan'&&viewer.morph.switched)"));
 assert.ok(!src.includes("mode:'layered',index:job.index"));
 assert.ok(src.includes("const useLocal=!!(spec.localGroup&&meshes.localShell&&(!viewer.morph||viewer.morph.mode==='camera-pan'))"));
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
  vm.runInContext('Math.random=()=>.99',f);f.queueViewerPreparation();const chosen=workers[0].request.record.seed;assert.equal(chosen,source==='stock'?103:3);
  for(let i=0;i<30;i++)f.queueViewerPreparation();assert.equal(workers.length,1);assert.equal(workers[0].terminated,undefined);
  f.startViewerMorph(-1);assert.equal(workers[0].terminated,true);assert.equal(workers[1].request.record.seed,source==='stock'?103:3);
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
 f.startViewerMorph();assert.equal(f.meshes,original);assert.equal(f.v.morph,null);const target=deliver(f,workers[0]);f.tickViewer(.01);
 assert.ok(f.v.morph);assert.equal(f.v.morph.originalMeshes,original);assert.equal(f.selected,0);const prepared=f.v.morph.targetMeshes;
 for(let i=0,steps=Math.ceil(f.v.morph.duration/.1)+2;i<steps;i++)f.tickViewer(.1);assert.equal(f.v.morph,null);assert.equal(f.selected,1);assert.equal(f.spec,target);assert.equal(f.spec.viewDistance,30);assert.equal(events.filter(x=>x==='apply').length,1);
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


test('the render loop advances the incoming pressure simulation before adoption',()=>{
 const {f}=runtime(),steps=[];Object.assign(f,{animating:true,lastFrame:0,environmentTime:0,psychedelicTime:0,rigTime:0,bodyTime:0,patternTime:0,modelYaw:0,auto:false,requestAnimationFrame(){},render(){},tickViewer(){},stepBiomeSystem:(bio,elapsed,speed)=>steps.push({bio,elapsed,speed})});
 f.tickBackgroundCycle=()=>{};f.tickStarNursery=()=>{};f.spec={biome:{name:'source'},genome:{}};f.v.morph={target:{biome:{name:'target'}}};f.$('motionSpeed').value='100';f.$('bodySpeed').value='100';
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
 const boot=scripts.find(script=>script.includes('Progress-bar-only boot screen'))||'';
 assert.match(boot,/window\.morphospaceBootDNAComplete=/);
 assert.match(html,/#bootSplash \.boot-dna\{display:none!important\}/);
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
 assert.match(html,/out\.push\(\{mesh:makeSwept/);
 assert.match(html,/delicate:\{root,phase,rows:segments\+1,sides,type:'strand',dir:outward,collarLength,collarRadius:thickness\*1\.6\}/);
 assert.match(html,/shifted\+=delicateWave\(shifted,anchorCanonical,u,phase,role,ancestralTime,uMotion\)/);
 assert.match(html,/\$\{delicateWaveGLSL\}/);
});

test('delicate organs attach inside the detailed implicit growth surface',()=>{
 assert.match(html,/function anchorOnGrowthSurface\(source,origin,direction,expectedRadius\)/);
 assert.match(html,/morphSDF\(origin\[0\]\+dir\[0\]\*t,origin\[1\]\+dir\[1\]\*t,origin\[2\]\+dir\[2\]\*t,source\)/);
 assert.match(html,/const root=anchorOnGrowthSurface\(source,origin,outward,radius\)/);
 assert.match(html,/anchor=anchorOnGrowthSurface\(source,finOrigin,outward,radius\)/);
 assert.match(html,/hit-Math\.min\(\.085,expectedRadius\*\.12\)/);
});

test('growth collars are fused into the source SDF before detailed skin tessellation',()=>{
 assert.match(html,/if\(em\.appendageBases\)for\(const base of em\.appendageBases\)/);
 assert.match(html,/acc=Math\.min\(acc,bd\)-h\*h\*k\*\.25/);
 assert.match(html,/const delicateParts=low\?\[\]:makeDelicateMorphOrgans\(source,g,palette,seed,detailDensity\)/);
 assert.match(html,/source\.appendageBases=delicateParts\.map/);
 assert.match(html,/if\(localShell\)localParts\.push\(\.\.\.delicateParts\)/);
 assert.ok(html.indexOf('source.appendageBases=delicateParts.map')<html.indexOf('localShell=morphImplicitMesh(source,palette,g,false,n)'));
});

test('flexible appendages follow body DNA with a root-fixed delayed travelling bend',()=>{
 const start=html.indexOf('const delicateWaveGLSL='),end=html.indexOf('const captureWarpGLSL=',start);
 assert.ok(start>=0&&end>start);
 const shader=html.slice(start,end);
 assert.match(shader,/float cycle=max\(\.166667,uMotionCycles\.y\)/);
 assert.match(shader,/float bodyPhase=6\.2831853\*t\*speed\+uMotionGene2\.y/);
 assert.match(shader,/float delayed=bodyPhase-u\*waveNumber\+phase\*\.28/);
 assert.match(shader,/float delayed2=bodyPhase\*\.73-u\*waveNumber\*\.76\+phase\*\.43/);
 assert.match(shader,/float taper=u\*u\*\(3\.-2\.\*u\)/);
 assert.match(shader,/return flex\*taper\*/);
});

test('delicate strands use real bounded Verlet constraints and body inertia',()=>{
 assert.match(html,/function makeVerletStrand\(mesh,d,genome\)/);
 assert.match(html,/function stepVerletStrand\(mesh,time,moving\)/);
 assert.match(html,/const steps=Math\.max\(1,Math\.min\(4,Math\.ceil\(elapsed\//);
 assert.match(html,/const correction=V\.scale\(diff,error\*/);
 assert.match(html,/const pose=sample\(time\),minus=sample\(time-h\),plus=sample\(time\+h\)/);
 assert.match(html,/gl\.bufferSubData\(gl\.ARRAY_BUFFER,0,mesh\.data\)/);
 assert.match(html,/mesh\.verlet=makeVerletStrand\(mesh,d,sp\.genome\)/);
 assert.match(html,/stepWorldStrand\(mesh,model,bodyTime,\$\('motion'\)\.checked\)/);
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
 assert.match(html,/const segments=Math\.max\(12,Math\.min\(24,/);
 assert.match(html,/p\.points\[0\]=anchor\.slice\(\)/);
 assert.match(html,/p\.points\[i\]=V\.add\(p\.points\[i-1\],V\.scale\(direction,p\.lengths\[i-1\]\)\)/);
});

test('tentacle stiffness decays inversely from the rooted insertion with specimen-specific coefficient',()=>{
 assert.match(html,/growthDirection:axis/);
 assert.match(html,/rootDecay:1\.5\+\(\(genome\?\.seed\|\|1\)\%991\)\/991\*7\.0/);
 assert.match(html,/const stiffness=1\/\(1\+p\.rootDecay\*u\*12\)/);
 assert.match(html,/p\.points\[i\]=V\.add\(p\.points\[i-1\],V\.scale\(direction,p\.lengths\[i-1\]\)\)/);
 assert.match(html,/const direction=V\.norm\(V\.add\(V\.scale\(guide,stiffness\),V\.scale\(segment,\(1-stiffness\)\/length\)\)\)/);
 assert.match(html,/const force=flow\.map\(\(v,a\)=>clamp\(/);
});

test('fin membranes render both sides and tentacles start with a curved physical pose',()=>{
 assert.match(html,/function doubleSidedMembrane\(mesh\)/);
 assert.match(html,/tri\[k\+1\]=mesh\.tri\[i\+2\]\+n/);
 assert.match(html,/mesh:doubleSidedMembrane\(buildMesh\(p,colors,faces,true\)\)/);
 assert.match(html,/Start already immersed in the flow/);
 assert.match(html,/const offset=V\.add\(V\.scale\(lateral,amp\*Math\.sin/);
 assert.match(html,/growthDirection:axis/);
});

test('tentacle angle diversity narrows, never widens, the established fan',()=>{
 assert.match(html,/const spread=\.38\+\.62\*rng\(\)/);
 assert.match(html,/V\.scale\(radial,\.85\*spread\)/);
 assert.match(html,/V\.scale\(radial,\.68\*spread\)/);
 assert.match(html,/V\.scale\(side,lane\*\.35\*spread\)/);
 assert.match(html,/Math\.max\(bodySize\/5,Math\.min\(allowLongTentacles\?bodySize\*2\.5:bodySize\*\.79,length\)\)/);
});
