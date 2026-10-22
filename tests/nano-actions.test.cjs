const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),source=scripts[2];
const core=source.slice(0,source.indexOf("const canvas=$('glview'),gl="));
const context=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],context);vm.runInContext(core,context);const fx=context.MorphospaceNanoFX;
const plain=x=>JSON.parse(JSON.stringify(x));
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('capture pulls back, draws the visible organism through one stationary glass lumen',()=>{
 assert.equal(fx.captureFrame(0).bodyX,.5);assert.equal(fx.captureFrame(0).bodyY,.5);
 let last=1;
 for(let t=0;t<2;t+=.025){const f=fx.captureFrame(t);assert.ok(f.zoom>=last-1e-8);assert.equal(f.suction,0);last=f.zoom}
 assert.equal(fx.captureFrame(1.4).zoom,2.85);
 assert.equal(fx.captureFrame(4.8).phase,'suction');
 assert.ok(fx.captureFrame(4.8).bodyScale>0&&fx.captureFrame(4.8).bodyScale<1);
 const end=fx.captureFrame(fx.CAPTURE);assert.equal(end.held,1);assert.ok(end.bodyScale>.4);assert.ok(end.bodyX>1.2);assert.equal(end.tipX,fx.captureFrame(3.35).tipX);assert.equal(end.done,true);
 for(const t of [-100,0,.2,1.3,2.05,2.85,4.15,100])for(const v of Object.values(fx.captureFrame(t)))if(typeof v==='number')assert.ok(Number.isFinite(v));
});

test('glass capillary has outward outer walls, inward lumen and an open annular lip',()=>{
 const mesh=fx.glassMesh();assert.ok(mesh.length>64*18*6);
 for(let j=0;j<mesh.length;j+=18){
  const p=Array.from(mesh.slice(j,j+18));assert.ok(p.every(Number.isFinite));
  const a=p.slice(0,3),b=p.slice(6,9),c=p.slice(12,15),u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  assert.ok(normal.reduce((sum,x,i)=>sum+x*p[i+3],0)>0,'winding agrees with physical wall normal');
  if(a[0]===0&&b[0]===0&&c[0]===0)for(const q of [a,b,c])assert.ok(Math.hypot(q[1],q[2])>.95,'lip never seals the lumen');
 }
});

test('iPhone portrait and landscape layouts keep both parent holders visible within a bounded pixel budget',()=>{
 for(const [w,h]of [[390,844],[430,932],[320,568],[844,390],[1366,768]]){
  const r=fx.resolution(w,h,3);assert.ok(r.width*r.height<562000);assert.ok(Math.abs(r.width/r.height-w/h)<.01);
  for(const p of [fx.layout(w,h).A,fx.layout(w,h).B]){assert.ok(p.x-p.r>=0);assert.ok(p.x+p.r*1.3<w);assert.ok(p.y-p.r*.7>0);assert.ok(p.y+p.r*.7<h)}
 }
 assert.equal(fx.parentFrame(1.5,false).pulse,0);
 assert.ok(fx.parentFrame(1.5,true).pulse>0);
});

test('the actual render transform aligns the moving specimen with the nozzle under any camera orbit',()=>{
 const transform=section(' if(nanoRenderPose&&recordHeight>0&&!videoRecording){',' const mLeft=base;');assert.ok(transform.length>100);
 const result=vm.runInContext(`(()=>{
  let worst=0;
  for(const modelYaw of [-2,0,.5,2])for(const modelPitch of [-.6,0,.6])for(const aspect of [.46,1.8]){
   const spec={viewDistance:70},w=aspect*500,h=500,nanoRenderPose={x:.61,y:.44,sx:.07,sy:.05,sz:.05},recordHeight=h,videoRecording=null;
   let base=scale3(1,1,1);${transform}
   const camera=mul4(translate(-spec.viewDistance),mul4(rotX(-modelPitch),rotY(-modelYaw))),m=mul4(persp(Math.PI*43/180,w/h,.1,200),mul4(camera,base));
   const x=(m[12]/m[15]+1)/2,y=(1-m[13]/m[15])/2;
   worst=Math.max(worst,Math.abs(x-.61),Math.abs(y-.44));
  }
  return worst;
 })()`,context);
 assert.ok(result<1e-5);
});

function captureFixture(fail=false){
 const events=[],elements={};
 const $=id=>elements[id]||(elements[id]={hidden:false,disabled:false,textContent:'',value:'',dataset:{},open:false,classList:{add(){},remove(){}},removeAttribute(){},showModal(){this.open=true;events.push('dialog')},close(){this.open=false}});
 const record={id:'captured',name:'捕獲標本',seed:1,genome:{},parents:[],generation:0,ecology:{text:'保存された生態文'}};
 let commit,animate,saves=0;
 const fixture={$,events,videoRecording:null,nanoAction:null,nanoOperationBusy:false,captureShareIsOpen:false,captureShareSequence:0,captureShareState:null,captureShareDialog:$('captureShareDialog'),
  nanoBusy:value=>{fixture.nanoOperationBusy=value},sharedPayload:()=>({version:1,record,view:{yaw:.5}}),currentIndividual:()=>record,copyJSON:plain,MorphospaceEcology:{ensure:r=>r.ecology},
  stockStore:{save:async()=>{saves++;events.push(saves===1?'save':'preview-save');if(fail)throw Error('quota');if(saves===1)await new Promise(resolve=>{commit=resolve});return {created:saves===1}}},refreshStock:async()=>{},
  CaptureShare:{postText:()=>'',card:()=>events.push('card')},localPublicBase:()=>'',setCaptureShareMessage:()=>{},cleanFilePart:x=>x,
  specimenImage:()=>{events.push('image');return {}},playNanoCapture:()=>{events.push('animation');return new Promise(resolve=>{animate=resolve})},
  document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>''})},canvasBlob:async()=>({}),makePNGFile:()=>null,nativeFileSupported:()=>false,URL:{createObjectURL:()=> 'blob:card'},console};
 vm.createContext(fixture);vm.runInContext(section('async function saveCaptureToStock(','async function exportStock(')+section('async function openCaptureShare(','async function saveCardToPhotos('),fixture);
 return {fixture,events,commit:()=>commit(),skip:()=>animate({skipped:true})};
}

test('capture commits once before animation, ignores rapid repeat clicks and keeps the sample when skipped',async()=>{
 const {fixture:f,events,commit,skip}=captureFixture();
 const capture=f.openCaptureShare('capture');await tick();assert.deepEqual(events,['save']);assert.equal(f.nanoOperationBusy,true);
 await f.openCaptureShare('capture');assert.equal(events.filter(x=>x==='save').length,1);
 commit();await tick();assert.deepEqual(events,['save','image','animation']);assert.equal(f.captureShareDialog.open,false);
 // Skip only shortens the visual; it cannot undo or repeat the committed save.
 skip();await capture;assert.equal(f.captureShareState.stockSaved,true);assert.equal(f.nanoOperationBusy,false);assert.equal(f.captureShareDialog.open,true);assert.ok(events.indexOf('dialog')>events.indexOf('animation'));
});

test('failed capture storage never plays a success animation',async()=>{
 const {fixture:f,events}=captureFixture(true);await f.openCaptureShare('capture');
 assert.equal(events.includes('animation'),false);assert.equal(f.captureShareState.stockSaved,undefined);assert.equal(f.nanoOperationBusy,false);assert.equal(f.$('retryStock').hidden,false);
});

test('an interrupted old capture cannot unlock a newer operation or reopen its card',async()=>{
 const {fixture:f,events,commit,skip}=captureFixture();const capture=f.openCaptureShare('capture');await tick();commit();await tick();
 f.captureShareSequence++;f.captureShareIsOpen=false;f.nanoOperationBusy=true;
 skip();await capture;assert.equal(f.nanoOperationBusy,true);assert.equal(f.captureShareDialog.open,false);assert.equal(events.includes('card'),false);
});

test('parent selection becomes active only after commit and remains selected when the animation is skipped',async()=>{
 const old={id:'old',name:'前の親',generation:0},rec={id:'new',name:'次の親',generation:1};let commit,finish;
 const events=[],f={nanoOperationBusy:false,nanoAction:null,videoRecording:null,busy:false,parentSlots:{A:old,B:null},pedigree:{},stockParentRevision:0,
  nanoBusy:value=>{f.nanoOperationBusy=value},snapshotIndividual:plain,copyJSON:plain,recordDisplayName:r=>r.name,
  stockStatus(){},$:()=>({textContent:''}),stockStore:{saveParents:()=>{events.push('save');return new Promise(resolve=>{commit=resolve})}},renderPedigree(){},updateFamilyInfo(){},
  playNanoParent:()=>{events.push('animation');return new Promise(resolve=>{finish=resolve})},console};
 vm.createContext(f);vm.runInContext(section('async function assignNanoParent(','$(\'nanoSceneSkip\').onclick'),f);
 const selecting=f.assignNanoParent(rec,'A');assert.equal(f.parentSlots.A.id,'old');assert.deepEqual(events,['save']);
 assert.equal(await f.assignNanoParent(rec,'B'),false);commit();await tick();assert.equal(f.parentSlots.A.id,'new');assert.deepEqual(events,['save','animation']);
 finish({skipped:true});assert.equal(await selecting,true);assert.equal(f.parentSlots.A.id,'new');assert.equal(f.nanoOperationBusy,false);
 f.stockStore.saveParents=async()=>{throw Error('denied')};events.length=0;
 assert.equal(await f.assignNanoParent({id:'failed',name:'失敗'},'B'),false);assert.equal(f.parentSlots.B,null);assert.equal(events.includes('animation'),false);
});

test('skip and interruption restore the camera and display controls, and resolve only once',()=>{
 const specimen={viewDistance:200},controls={macroDof:{checked:false},rigviz:{checked:false}},cancelled=[],results=[];
 const f={spec:specimen,selected:0,nanoRenderPose:{sx:.01},modelYaw:8,modelPitch:9,panX:10,panY:11,auto:false,lastFrame:0,
  $:id=>controls[id],performance:{now:()=>777},cancelAnimationFrame:id=>cancelled.push(id),clearTimeout:id=>cancelled.push(id),console,
  nanoDialog:{open:true,close(){this.open=false}},render(){assert.equal(f.nanoRenderPose,null);assert.equal(f.spec.viewDistance,17)}};
 f.nanoAction={live:true,spec:specimen,raf:12,timer:13,saved:{distance:17,yaw:.5,pitch:-.2,panX:2,panY:-1,auto:true,macroDof:true,rigviz:true},resolve:r=>results.push(r)};
 vm.createContext(f);vm.runInContext(section('function finishNanoAction(','function playNanoScene('),f);
 f.finishNanoAction(true);f.finishNanoAction(true);
 assert.equal(f.nanoAction,null);assert.equal(f.nanoDialog.open,false);assert.deepEqual(cancelled,[12,13]);assert.deepEqual(plain(results),[{skipped:true}]);
 assert.deepEqual([f.modelYaw,f.modelPitch,f.panX,f.panY,f.auto,f.lastFrame],[.5,-.2,2,-1,true,777]);assert.equal(controls.macroDof.checked,true);assert.equal(controls.rigviz.checked,true);
});


test('micromanipulator aligns and settles before pressure, then fluid transport accelerates smoothly',()=>{
 const aligned=fx.captureFrame(3.35);assert.equal(aligned.pressure,0);assert.equal(aligned.suction,0);
 assert.ok(Math.abs(fx.captureFrame(2.9).tipX-aligned.tipX)<.001);
 const speed=t=>(fx.captureFrame(t+.001).bodyX-fx.captureFrame(t-.001).bodyX)/.002;
 assert.ok(speed(4.16)<speed(4.6));assert.ok(speed(4.6)<speed(5.3));
 assert.ok(Math.abs(speed(7)-speed(8))<.004,'pump keeps moving through the tube rather than stopping between cuts');
 for(const t of [2.25,2.3,2.95,3.35,4.15,5.75]){
  const before=fx.captureFrame(t-.0001),after=fx.captureFrame(t+.0001);
  assert.ok(Math.abs(before.bodyX-after.bodyX)<.0001);assert.ok(Math.abs(before.tipX-after.tipX)<.0001);
 }
 for(const x of [0,.25,1,4,8,14]){const p=fx.glassProfile(x);assert.ok(p.wall/p.outer<.05);assert.ok(p.outer-p.wall>.95)}
});

test('suction is local, draws particles toward the open mouth and does not pull them through the glass wall',()=>{
 const tip=[0,0,0],upstream=[-.15,.07,.025];
 assert.deepEqual(plain(fx.flowVelocity(upstream,tip,0).velocity),[0,0,0]);
 const flow=fx.flowVelocity(upstream,tip,1);assert.ok(flow.velocity[0]>0);assert.ok(flow.velocity[1]<0);assert.ok(flow.velocity[2]<0);
 for(const point of [[-1,0,0],[.15,.15,0],[.05,0,.12]])assert.deepEqual(plain(fx.flowVelocity(point,tip,1).velocity),[0,0,0]);
 const tube=fx.flowVelocity([.1,.01,.01],tip,1,true);assert.equal(tube.entered,true);assert.ok(tube.velocity[0]>.3);
 const farther=fx.flowVelocity([-.25,.03,0],tip,1),closer=fx.flowVelocity([-.08,.03,0],tip,1);
 assert.ok(Math.hypot(...closer.velocity)>Math.hypot(...farther.velocity),'particles speed up near the mouth');
});

test('the original 3D snow is advected continuously with inertia and stable trajectories at 30/60 fps',()=>{
 const data=new Float32Array([-.2,.07,.01,1,.4,.1,.7]),original=Array.from(data),view=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],frame={tipX:.5,tipY:.5,pressure:1};
 const run=fps=>{const state=fx.createFlow(data,0,view,1,0);state.position.set([-.18,.07,.01]);let lastX=state.position[0];
  for(let i=1;i<=fps*4;i++){fx.stepFlow(state,frame,i/fps,1);assert.ok(state.position[0]>=lastX-1e-7);lastX=state.position[0];assert.ok(Array.from(state.output).every(Number.isFinite))}
  assert.equal(state.entered[0],1);assert.ok(state.position[0]>.2);assert.equal(state.output.length,10);return state;
 };
 const a=run(30),b=run(60);assert.ok(Math.hypot(...Array.from(a.position,(x,i)=>x-b.position[i]))<.015);
 assert.deepEqual(Array.from(data),original,'archive and ordinary snow buffer are never mutated');
 const idle=fx.createFlow(data,0,view,1,0);fx.stepFlow(idle,{...frame,pressure:0},.05,1);
 const ambient=fx.ambientSnow(data,0,.05);for(let i=0;i<3;i++)assert.ok(Math.abs(idle.output[i]-ambient[i])<1e-6);
});

test('portrait dolly-out reveals a fixed wider 3D field and keeps distant suction particles visible',()=>{
 const base=new Float32Array(960*7);let seed=937651;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<960;i++)base.set([(r()-.5)*48,(r()-.5)*36,(r()-.5)*48,.75+r()*3,r(),(r()-.5)*1.5,r()],i*7);
 for(const aspect of [390/844,430/932,844/390]){
  const distance=70,view=vm.runInContext('Array.from(mul4(translate(-70),mul4(rotX(-.2),rotY(-.5))))',context),field=fx.createCaptureSnow(base,view,distance,aspect,9000),frame=fx.captureSnowFrame(field,9000),tan=Math.tan(Math.PI*43/360);
  const visible=zoom=>{let n=0;for(let i=0;i<field.count;i++){const j=i*10,x=frame[j],y=frame[j+1],z=frame[j+2];const vx=view[0]*x+view[4]*y+view[8]*z+view[12],vy=view[1]*x+view[5]*y+view[9]*z+view[13],depth=-(view[2]*x+view[6]*y+view[10]*z+view[14])+distance*(zoom-1);if(depth>0&&Math.abs(vx)<depth*tan*aspect&&Math.abs(vy)<depth*tan)n++}return n};
  const counts=[1,1.4,2,2.85].map(visible);for(let i=1;i<counts.length;i++)assert.ok(counts[i]>counts[i-1],JSON.stringify(counts));assert.ok(counts[3]>counts[0]*2);
  const farView=view.slice();farView[14]-=distance*1.85;
  const flow=fx.createFlow(field.data,9000,farView,2*distance*2.85*tan,distance*2.85);
  for(let i=1;i<=120;i++)fx.stepFlow(flow,{tipX:.53,tipY:.52,pressure:Math.min(1,i/27)},9000+i/30,aspect);
  assert.ok(Array.from(flow.entered).reduce((a,b)=>a+b,0)>30,'a visible stream reaches the lumen in portrait and landscape');
  assert.ok(field.count<=4160);assert.equal(base.length,960*7);
 }
});

test('light particles enter first while the body and its deformation remain still for 0.8 seconds',()=>{
 const frame=fx.captureFrame(3.9);assert.ok(frame.pressure>.5);assert.equal(frame.bodyPressure,0);assert.equal(frame.suction,0);assert.equal(frame.bodyX,fx.captureFrame(3.35).bodyX);assert.equal(frame.phase,'flow');
 const data=new Float32Array([0,0,0,.8,.4,.1,.7]),view=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],flow=fx.createFlow(data,3.35,view,1,0);
 flow.position.set([.03-.045,-.02+.01,0]);
 for(let i=1;i<=23;i++)fx.stepFlow(flow,fx.captureFrame(3.35+i/30),3.35+i/30,1);
 assert.equal(flow.entered[0],1,'a light particle crosses the inlet before body transport begins');
 assert.ok(fx.captureFrame(4.4).bodyPressure>0);assert.ok(fx.captureFrame(4.4).bodyX>frame.bodyX);
});

test('landscape survey particles fill the central area at the same density as neighboring areas',()=>{
 const base=new Float32Array(960*7),view=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-70,1],aspect=844/390,field=fx.createCaptureSnow(base,view,70,aspect,4000);
 const initial=fx.captureSnowFrame(field,4000,0);let hidden=0;
 for(let i=960;i<field.count;i++)if(field.revealMask[i]){assert.equal(initial[i*10+6],-1);hidden++}
 assert.ok(hidden>200,'central additions reveal gradually rather than popping into the first frame');
 const frame=fx.captureSnowFrame(field,4000,1),bins=Array(9).fill(0),tan=Math.tan(Math.PI*43/360);
 for(let i=960;i<field.count;i++){
  const j=i*10,depth=70*2.85-frame[j+2],x=frame[j]/(depth*tan*aspect),y=frame[j+1]/(depth*tan);
  if(Math.abs(x)>=.9||Math.abs(y)>=.9)continue;
  bins[Math.floor((y+.9)/.6)*3+Math.floor((x+.9)/.6)]++;
 }
 const center=bins[4],neighbors=bins.filter((_,i)=>i!==4),mean=neighbors.reduce((a,b)=>a+b,0)/8;
 assert.ok(center>mean*.8&&center<mean*1.2,JSON.stringify(bins));
});

test('micro-extraction leaves the parent in place and recovers contact deformation after transporting a small 3D sample',()=>{
 const contact={x:.59,y:.51};
 assert.equal(fx.extractFrame(3.1,contact).tissues.length,0);
 assert.ok(fx.extractFrame(3.1,contact).pressure>0);
 const sample=fx.extractFrame(4.6,contact);assert.equal(sample.bodyX,.38);assert.equal(sample.bodyY,.54);assert.equal(sample.tissues.length,1);
 assert.ok(sample.tissues[0].r<=.014);assert.ok(sample.tissues[0].x>contact.x);
 const end=fx.extractFrame(fx.EXTRACT,contact);assert.equal(end.bodyPressure,0);assert.equal(end.bodyX,.38);assert.equal(end.done,true);assert.ok(end.tissues[0].x>1);
 for(let t=0;t<fx.EXTRACT;t+=.03)for(const value of Object.values(fx.extractFrame(t,contact)))if(typeof value==='number')assert.ok(Number.isFinite(value));
});

test('extracted tissue stays connected until its neck pinches off, then accelerates into the lumen',()=>{
 const contact={x:.59,y:.51},growing=fx.extractFrame(3.8,contact),pinching=fx.extractFrame(4.2,contact),separated=fx.extractFrame(4.35,contact);
 assert.ok(growing.neck&&pinching.neck);assert.equal(growing.neck.x0,contact.x-.004);
 assert.equal(growing.neck.x1,growing.tissues[0].x);assert.equal(growing.neck.y1,growing.tissues[0].y);
 assert.ok(pinching.neck.r<fx.extractFrame(4.05,contact).neck.r);assert.equal(separated.neck,null);
 assert.ok(separated.sampleTug>0);assert.equal(fx.extractFrame(5.1,contact).sampleTug,0);
 assert.ok(fx.extractFrame(4.8,contact).tissues[0].x>separated.tissues[0].x);
 for(let t=3.51;t<4.34;t+=.01){const f=fx.extractFrame(t,contact);assert.ok(f.neck.r>0);assert.equal(f.neck.x1,f.tissues[0].x);assert.equal(f.bodyPressure,0)}
 const before=fx.extractFrame(4.349,contact).tissues[0],after=fx.extractFrame(4.351,contact).tissues[0];assert.ok(Math.abs(after.x-before.x)<.00001);
});

test('release sends fluid out before the actual organism and lets its free shape recover outside the tube',()=>{
 const before=fx.releaseFrame(1.5);assert.ok(before.pressure>.5);assert.equal(before.bodyX,1.2);assert.equal(before.flowDirection,-1);
 const exiting=fx.releaseFrame(3.2);assert.ok(exiting.bodyX<1.2&&exiting.bodyX>.36);assert.ok(exiting.bodyPressure>0);
 const end=fx.releaseFrame(fx.RELEASE);assert.equal(end.bodyX,.36);assert.equal(end.bodyPressure,0);assert.equal(end.axisAlign,0);assert.equal(end.done,true);
 const data=new Float32Array([0,0,0,1,.5,.1,.6]),identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],state=fx.createFlow(data,1.05,identity,1,0);
 state.position.set([.07+.02,-.02+.001,0]);
 for(let i=1;i<=15;i++)fx.stepFlow(state,fx.releaseFrame(1.05+i/30),1.05+i/30,1);
 assert.ok(state.position[0]<.09,'fluid travels left, out of the capillary');
});

test('two material-bearing samples converge inside a hollow 3D junction before offspring generation',()=>{
 const start=fx.breedFrame(.7),joined=fx.breedFrame(3.4),end=fx.breedFrame(fx.BREED);
 assert.ok(start.tissues[0].y<start.tissues[1].y);assert.equal(start.hideBody,true);
 assert.ok(Math.abs(joined.tissues[0].y-joined.tissues[1].y)<.001);assert.equal(joined.tissues[0].material,0);assert.equal(joined.tissues[1].material,1);
 assert.ok(end.tissues.every(t=>t.x>1));assert.equal(end.done,true);
 const mesh=fx.junctionMesh(24,12);assert.ok(mesh.length>1000&&mesh.length<200000);
 for(let j=0;j<mesh.length;j+=18){
  const p=Array.from(mesh.slice(j,j+18));assert.ok(p.every(Number.isFinite));
  const u=[p[6]-p[0],p[7]-p[1],p[8]-p[2]],v=[p[12]-p[0],p[13]-p[1],p[14]-p[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  assert.ok(n.reduce((sum,x,i)=>sum+x*p[i+3],0)>0,'outer and inner tube faces have consistent winding');
 }
});

test('temporary lab rendering restores the real specimen and GPU buffers even after interruption',async()=>{
 const old={viewDistance:17},oldMeshes={id:'real buffers'},oldRigs=[{id:'real rig'}],oldRecord={id:'real record'},events=[],info={textContent:'original'};
 const f={gl:{},renderer:{},spec:old,meshes:oldMeshes,rigMeshes:oldRigs,selected:9,activeStoredIndividual:oldRecord,modelYaw:.8,modelPitch:-.2,panX:2,panY:3,auto:true,bodyTime:13,rigTime:14,lastFrame:0,nanoAction:null,
  snapshotEmissionUI:()=>({original:true}),restoreEmissionUI:x=>events.push(x.original?'emission restored':'bad'),$:()=>info,copyJSON:plain,pickPalette:()=>({}),makeSpecimen:()=>({temporary:true}),getSpecEmissionDNA:()=>({}),applyEmissionDNAtoUI(){},performance:{now:()=>999},
  applyUploadedSpecimen(sp){f.spec=sp;f.meshes={id:'temporary buffers'};f.rigMeshes=[]},destroyMeshes(){events.push(f.meshes?.id);f.meshes=null;f.rigMeshes=[]},render(){assert.equal(f.spec,old);assert.equal(f.meshes,oldMeshes)}};
 vm.createContext(f);vm.runInContext(section('async function withNanoSpecimen(','async function playNanoParent('),f);
 await assert.rejects(f.withNanoSpecimen({seed:1,genome:{style:0}},async()=>{assert.equal(f.spec.temporary,true);assert.notEqual(f.meshes,oldMeshes);throw Error('interrupted')}),/interrupted/);
 assert.equal(f.spec,old);assert.equal(f.meshes,oldMeshes);assert.equal(f.rigMeshes,oldRigs);assert.equal(f.activeStoredIndividual,oldRecord);
 assert.deepEqual([f.selected,f.modelYaw,f.modelPitch,f.panX,f.panY,f.auto,f.bodyTime,f.rigTime,f.lastFrame],[9,.8,-.2,2,3,true,13,14,999]);assert.ok(events.includes('temporary buffers'));assert.ok(!events.includes('real buffers'));
});

test('breeding starts exactly once after the convergence scene, while a navigation interruption cancels generation',async()=>{
 let finish;const calls=[],parents={A:{id:'a',name:'A',genome:{}},B:{id:'b',name:'B',genome:{}}},f={nanoAction:null,nanoOperationBusy:false,busy:false,parentSlots:parents,nanoLabRevision:0,snapshotIndividual:plain,recordDisplayName:r=>r.name,
  nanoBusy:v=>{f.nanoOperationBusy=v},withNanoSpecimen:async(rec,run)=>run(),playNanoScene:()=>new Promise(resolve=>{finish=resolve}),$:()=>({value:''}),build:async(seed,g,cx)=>calls.push(cx),Math,console};
 vm.createContext(f);vm.runInContext(section('async function startBreeding(){','function exportPedigree(){'),f);
 const operation=f.startBreeding();await tick();await f.startBreeding();assert.equal(calls.length,0);finish({skipped:true});await operation;assert.equal(calls.length,1);assert.equal(calls[0].parents[0].id,'a');assert.equal(f.nanoOperationBusy,false);
 const interrupted=f.startBreeding();await tick();f.nanoLabRevision++;finish({skipped:true});await interrupted;assert.equal(calls.length,1);
});


test('stored parent selection uses the same micro-extraction scene on an isolated saved specimen',async()=>{
 const saved={id:'saved-parent',name:'Saved'},events=[];
 const f={spec:{},currentIndividual:()=>saved,recordDisplayName:r=>r.name,
  playNanoScene:async options=>{events.push(options);return {skipped:false}},
  withNanoSpecimen:async(rec,run)=>{assert.equal(rec,saved);events.push('saved specimen');return run()}};
 vm.createContext(f);vm.runInContext(section('async function playNanoParent(','function finishNanoAction('),f);
 f.assignNanoParent=(rec,slot,source)=>f.playNanoParent(rec,slot,source);
 vm.runInContext(section('async function chooseStoredParent(','function renderStock'),f);
 await f.chooseStoredParent({payload:{record:saved}},'B');
 assert.equal(events[0],'saved specimen');assert.equal(events[1].kind,'extract');assert.equal(events[1].slot,'B');
 events.length=0;await f.playNanoParent(saved,'A','extract');assert.equal(events.length,1);assert.equal(events[0].kind,'extract');
});


test('every initialized vertex shader calling captureClip includes its definition in both renderer modes',()=>{
 const shaders=vm.runInContext('({vert,ciliaVert,compatibleVert,compatibleCiliaVert})',context);
 for(const [name,shader] of Object.entries(shaders)){
  if(/gl_Position\s*=\s*captureClip\(/.test(shader)){
   const definition=shader.indexOf('vec4 captureClip(vec4 clip)');assert.ok(definition>=0,name+' must define captureClip');assert.ok(definition<shader.indexOf('void main()'),name+' definition must precede main');
  }
 }
});
