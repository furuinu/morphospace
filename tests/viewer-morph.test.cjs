const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2],core=src.slice(0,src.indexOf("const canvas=$('glview'),gl="));
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(core,ctx);
function mesh(vertices,tri){const data=new Float32Array(vertices.length*17);vertices.forEach((p,i)=>data.set([...p,0,0,1,1,0,0,0,0,0,0,0,0,0,0],i*17));return{data,tri:new Uint16Array(tri)}}
const a=mesh([[0,0,0],[1,0,0],[0,1,0]],[0,1,2]),b=mesh([[0,0,1],[2,0,1],[0,2,1],[-2,0,1]],[0,1,2,0,2,3]);
test('morph preserves every triangle of unequal topology at both endpoints with safe WebGL1 indices',()=>{
 const result=ctx.createMorphBatches([a],[b],1);assert.equal(result.length,3);
 const sourceBefore=Array.from(a.data),targetBefore=Array.from(b.data);
 for(const batch of result){assert.ok(Math.max(...batch.tri)<65536);ctx.interpolateMorphBatch(batch,0);assert.deepEqual(Array.from(batch.data),Array.from(batch.start));ctx.interpolateMorphBatch(batch,1);for(let i=0;i<batch.data.length;i++)assert.ok(Math.abs(batch.data[i]-batch.end[i])<1e-6);ctx.interpolateMorphBatch(batch,.5);for(let i=0;i<batch.data.length;i++)assert.ok(Math.abs(batch.data[i]-(batch.start[i]+batch.end[i])*.5)<1e-6)}
 const faces=result.slice(1).map(x=>Array.from(x.end).filter((_,i)=>i%17<3).join(','));assert.equal(new Set(faces).size,2);
 assert.deepEqual(Array.from(a.data),sourceBefore);assert.deepEqual(Array.from(b.data),targetBefore);
});
test('real seeded organisms create finite intermediate geometry without changing their DNA',()=>{
 const r=vm.runInContext(`(()=>{const make=seed=>{const p=pickPalette(seed),sp=makeSpecimen(seed,0,p,true,null,.75,.84,.75,0);return {sp,surfaces:[dynamicMesh(sp.shell,0,0,[0,0,0]),...dynamicBatches(sp).map(p=>p.mesh)]}};const a=make(731029),b=make(571938),dna=JSON.stringify([a.sp.genome,b.sp.genome]),m=createMorphBatches(a.surfaces,b.surfaces);for(const batch of m)interpolateMorphBatch(batch,.5);return {finite:m.every(b=>Array.from(b.data).every(Number.isFinite)),triangles:m.reduce((n,b)=>n+b.tri.length/3,0),sameDNA:dna===JSON.stringify([a.sp.genome,b.sp.genome])}})()`,ctx);
 assert.ok(r.finite);assert.ok(r.triangles>100);assert.ok(r.sameDNA);
});
function runtime(){const elements={},events=[],raf=[],timers=[];const f={console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),TAU:Math.PI*2,performance:{now:()=>100},document:{hidden:false},spec:{baseViewDistance:10,viewDistance:20},selected:0,activeStoredIndividual:null,busy:false,videoRecording:null,nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,population:[{id:'a'},{id:'b'}],meshes:{id:'original'},rigMeshes:['original-rig'],gl:{ARRAY_BUFFER:1,bindBuffer(){},bufferSubData(){events.push('upload')}},destroy:(gl,m)=>events.push(m.id),applyUploadedSpecimen:(sp)=>{f.spec=sp;events.push('apply')},currentIndividual:()=>({name:'original'}),recordDisplayName:r=>r.name,viewerMetadata:()=>events.push('metadata'),requestAnimationFrame:cb=>raf.push(cb),setTimeout:cb=>timers.push(cb),$:id=>elements[id]||(elements[id]={open:false,value:'0',textContent:'',checked:true,classList:{toggle(){},remove(){}},setAttribute(){}})};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const viewer='),src.indexOf("$('viewerFullscreen').onclick=")),f);f.v=vm.runInContext('viewer',f);return{f,events,raf,timers}}
test('closing cancels queued navigation before it can generate or replace a specimen',()=>{const {f,raf,timers}=runtime();f.startViewerMorph();assert.equal(f.v.preparing,true);f.stopViewer();raf.shift()();timers.shift()();assert.equal(f.v.morph,null);assert.equal(f.v.preparing,false);assert.equal(f.selected,0);assert.equal(f.meshes.id,'original')});
test('timer pauses for hidden pages and completes a morph once, releasing only transient buffers',()=>{const {f,events}=runtime();f.v.seconds=5;f.document.hidden=true;f.tickViewer(6);assert.equal(f.v.elapsed,0);f.document.hidden=false;
 const source=f.spec,target={id:'target'},original=f.meshes;f.interpolateMorphBatch=()=>{};f.v.morph={source,target,index:1,originalMeshes:original,originalRigs:f.rigMeshes,batches:[{id:'transient',buffer:1,data:new Float32Array(17)}],elapsed:2.79,lastUpload:0,fromDistance:20,toDistance:30,t:0};f.tickViewer(.1);assert.equal(f.v.morph,null);assert.equal(f.selected,1);assert.equal(f.spec,target);assert.equal(f.spec.viewDistance,30);assert.equal(events.filter(e=>e==='transient').length,1);assert.equal(events.filter(e=>e==='apply').length,1);assert.ok(!events.includes('original'))});

test('adjacent faces keep the same mapped endpoint for every shared vertex',()=>{
 const batches=ctx.createMorphBatches([b],[a],1),v0=Array.from(batches[0].end.slice(0,3)),v1=Array.from(batches[1].end.slice(0,3));assert.deepEqual(v0,v1);
 for(const t of [.1,.5,.9]){ctx.interpolateMorphBatch(batches[0],t);ctx.interpolateMorphBatch(batches[1],t);assert.deepEqual(Array.from(batches[0].data.slice(0,3)),Array.from(batches[1].data.slice(0,3)))}
});
test('navigation prepares real correspondence before replacing buffers and commits the next individual',()=>{
 const {f,raf,timers,events}=runtime(),original={shell:a,parts:[],cilia:[]},target={seed:2,glowProfile:{},shell:b,parts:[],rigs:[]};f.meshes=original;
 f.createSpecimenForIndex=index=>{assert.equal(index,1);return target};f.dynamicMesh=x=>x;f.dynamicBatches=()=>[];f.createMorphBatches=ctx.createMorphBatches;f.interpolateMorphBatch=ctx.interpolateMorphBatch;f.upload=(gl,b)=>({...b,buffer:1,id:'transition'});f.viewerPatternValues=()=>new Map();f.specimenViewDistance=()=>15;
 f.startViewerMorph();raf.shift()();timers.shift()();assert.ok(f.v.morph);assert.equal(f.v.morph.originalMeshes,original);assert.equal(f.selected,0);
 for(let i=0;i<30;i++)f.tickViewer(.1);assert.equal(f.v.morph,null);assert.equal(f.selected,1);assert.equal(f.spec,target);assert.equal(f.spec.viewDistance,30);assert.equal(events.filter(x=>x==='apply').length,1);
});


test('zoom slider and pinch share distance bounds and preserve both morph endpoints when zoomed',()=>{
 const {f}=runtime();f.syncViewerZoom();const bounds=f.viewerZoomBounds();assert.equal(bounds.min,4);assert.equal(bounds.max,24);
 f.setViewerDistance(8);assert.equal(f.spec.viewDistance,8);f.setViewerDistance(100);assert.equal(f.spec.viewDistance,24);
 f.specimenViewDistance=()=>10;f.v.morph={source:f.spec,target:{},t:.5,fromDistance:20,toDistance:10};f.spec.viewDistance=15;f.setViewerDistance(7.5);assert.equal(f.v.morph.fromDistance,10);assert.equal(f.v.morph.toDistance,5);assert.equal(f.spec.viewDistance,7.5);
 f.v.morph=null;f.v.fit=2;assert.equal(f.viewerZoomBounds().max,48);
});
