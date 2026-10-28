const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const context=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],context);vm.runInContext(scripts[1],context);
vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),context);
const run=code=>vm.runInContext(code,context,{timeout:30000});
const plain=value=>JSON.parse(JSON.stringify(value));
function entry(seed=912403){
 return plain(run(`(()=>{
  const genome=makeFounderGenome(${seed},0,1);
  const record={id:'stock-${seed}',name:'捕獲標本',seed:genome.seed,style:genome.style,genome,generation:0,parents:[],mutationLog:['捕獲前の記録'],inherited:{shape:1},sourceSeed:731029,index:1,mode:'wild'};
  MorphospaceEcology.ensure(record);
  return {payload:{version:1,record,view:{density:91,micro:64,emitColor:8,fresnelStrength:37,iridescenceStrength:121,motionSpeed:77,bodySpeed:123,motion:true,auto:false,branchMotion:true,branchSolo:false,macroDof:true,dofStrength:55,dofFocus:-12,yaw:1.7,zoom:1.4,time:14}},preview:'data:image/jpeg;base64,/9j/2Q==',savedAt:'2026-10-22T10:00:00.000Z',updatedAt:'2026-10-22T10:01:00.000Z'};
 })()`));
}

test('stock export/import retains full DNA, ecology, genealogy and view controls without mutation',()=>{
 const original=entry(),copy=structuredClone(original),other=entry(503219);
 const archive=context.MorphospaceStock.exportData([original,other],{A:original.payload.record,B:other.payload.record});
 const decoded=context.MorphospaceStock.parseImport(JSON.stringify(archive));
 assert.deepEqual(plain(decoded.entries[0]),{id:original.payload.record.id,...original});
 assert.deepEqual(plain(decoded.parents),{A:original.payload.record,B:other.payload.record});
 assert.deepEqual(original,copy);
 assert.notEqual(decoded.entries[0].payload.record.genome,original.payload.record.genome);
});

test('restored specimens retain exact geometry, pigmentation and inherited parent IDs',()=>{
 const original=entry(),archive=context.MorphospaceStock.exportData([original],{A:null,B:null});
 context.original=original.payload.record;context.restored=context.MorphospaceStock.parseImport(JSON.stringify(archive)).entries[0].payload.record;
 const result=run(`(()=>{
  const make=r=>makeSpecimen(r.seed,r.genome.style,pickPalette(r.seed,r.genome.colorDNA,r.genome.patternDNA),true,null,.7,.91,.64,r.genome.archetype,null,copyJSON(r.genome));
  const a=make(original),b=make(restored),child=crossoverGenome(restored,{...restored,id:'other',genome:makeFounderGenome(503219,1,4)},146073,2,.75).genome;
  return {mesh:JSON.stringify([...a.shell.data])===JSON.stringify([...b.shell.data]),topology:JSON.stringify([...a.shell.tri])===JSON.stringify([...b.shell.tri]),palette:JSON.stringify(a.palette.hex)===JSON.stringify(b.palette.hex),child:!!child.morphDNA&&!!child.motionDNA&&!!child.patternDNA};
 })()`);
 assert.deepEqual(plain(result),{mesh:true,topology:true,palette:true,child:true});
});

test('malformed stock archives fail validation before a storage transaction begins',()=>{
 const api=context.MorphospaceStock,valid=api.exportData([entry()],{A:null,B:null});
 const badDNA=structuredClone(valid);badDNA.entries[0].payload.record.genome.morphDNA.axial=99;
 const badPreview=structuredClone(valid);badPreview.entries[0].preview='https://invalid.example/tracking';
 const duplicate=structuredClone(valid);duplicate.entries.push(duplicate.entries[0]);
 for(const bad of [badDNA,badPreview,duplicate,{...valid,version:99},{...valid,entries:null}])assert.throws(()=>api.parseImport(JSON.stringify(bad)));
 assert.throws(()=>api.parseImport(JSON.stringify(valid).replace('"inherited":{','"inherited":{"__proto__":{},')));
 assert.throws(()=>api.normalizeEntry({payload:{...entry().payload,record:{...entry().payload.record,id:'__proto__'}}}));
});

test('opening a stored specimen uses isolated DNA and leaves gallery records and mesh caches intact',()=>{
 const source=scripts[2],begin=source.indexOf('function createSpecimenForIndex('),end=source.indexOf('function applyUploadedSpecimen(',begin);
 const saved=entry(),gallery=[{seed:567,genome:{id:'gallery'}}],cache=[{id:'cached-detail'}];
 const fixture={activeStoredIndividual:saved,detailSpecimens:cache,detailCacheOrder:[0],seeds:[567],genomes:gallery.map(r=>r.genome),
  copyJSON:value=>JSON.parse(JSON.stringify(value)),pickPalette:()=>({id:'palette'}),$:()=>({value:'75'}),
  makeSpecimen:(seed,style,palette,low,parent,variance,density,micro,archetype,motion,genome)=>{genome.morphDNA.axial=999;return {seed,style}},ensureEmissionDNA(){}};
 vm.createContext(fixture);vm.runInContext(source.slice(begin,end),fixture);
 const before=structuredClone(saved);assert.equal(fixture.createSpecimenForIndex(0).seed,saved.payload.record.seed);
 assert.deepEqual(saved,before);assert.equal(fixture.detailSpecimens,cache);assert.deepEqual(fixture.detailCacheOrder,[0]);assert.equal(fixture.seeds[0],567);
});

test('capture persists DNA before image rendering and completes only after the IndexedDB commit',async()=>{
 const source=scripts[2],begin=source.indexOf('async function saveCaptureToStock('),end=source.indexOf('async function exportStock(',begin),els={};
 const $=id=>els[id]||(els[id]={textContent:'',classList:{add(){},remove(){}},hidden:true,disabled:false});
 let commit,refreshed=0;const state={stockPayload:entry().payload};
 const fixture={$: $,captureShareSequence:5,stockStore:{save:()=>new Promise(resolve=>{commit=resolve})},refreshStock:async()=>{refreshed++}};
 vm.createContext(fixture);vm.runInContext(source.slice(begin,end),fixture);
 const saving=fixture.saveCaptureToStock(state,5);assert.equal(state.stockSaved,undefined);assert.equal(refreshed,0);
 commit({created:true});assert.equal(await saving,true);assert.equal(state.stockSaved,true);assert.equal(refreshed,1);
 fixture.stockStore.save=async()=>{throw Error('quota exceeded')};
 assert.equal(await fixture.saveCaptureToStock({stockPayload:entry().payload},5),false);assert.equal($('retryStock').hidden,false);assert.match($('captureStockStatus').textContent,/保存できません/);
 const openCapture=source.slice(source.indexOf('async function openCaptureShare('),source.indexOf('async function saveCardToPhotos('));
 assert.ok(openCapture.indexOf('await saveCaptureToStock')<openCapture.indexOf('specimenImage()'));
});

test('unavailable browser storage reports an error without pretending to save',async()=>{
 const store=context.MorphospaceStock.createStore(null);
 await assert.rejects(store.save(entry()),/保存できません/);
 await assert.rejects(store.list(),/保存できません/);
});

test('capture card enlarges the specimen to cover its framed image with symmetric crop',()=>{
 const text=html;
 assert.match(text,/Math\.max\(w\/image\.width,h\/image\.height\)\*1\.02/);
 assert.match(text,/c\.drawImage\(image,x\+\(w-iw\)\/2,y\+\(h-ih\)\/2,iw,ih\)/);
 assert.match(text,/roundRect\(c,x,y,w,h,12\);c\.clip\(\)/);
});
