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

test('capture pulls back before suction, then holds a saved specimen without an abrupt stage jump',()=>{
 assert.equal(fx.captureFrame(0).bodyX,.5);assert.equal(fx.captureFrame(0).bodyY,.5);
 let last=1;
 for(let t=0;t<2;t+=.025){const f=fx.captureFrame(t);assert.ok(f.zoom>=last-1e-8);assert.equal(f.suction,0);last=f.zoom}
 assert.equal(fx.captureFrame(1.4).zoom,2.85);
 assert.equal(fx.captureFrame(2.4).phase,'suction');
 assert.ok(fx.captureFrame(2.4).bodyScale>0&&fx.captureFrame(2.4).bodyScale<1);
 const end=fx.captureFrame(fx.CAPTURE);assert.equal(end.held,1);assert.ok(end.bodyScale<.002);assert.equal(end.done,true);
 for(const t of [-100,0,.2,1.3,2.05,2.85,4.15,100])for(const v of Object.values(fx.captureFrame(t)))if(typeof v==='number')assert.ok(Number.isFinite(v));
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
  nanoParentSprite:async r=>r?{}:null,playNanoScene:()=>{events.push('animation');return new Promise(resolve=>{finish=resolve})},console};
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
