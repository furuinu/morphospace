const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const moduleStart=html.indexOf('/* Browser-local stock,');
const moduleEnd=html.indexOf('/* Lightweight cinematic instruments;',moduleStart);
assert.ok(moduleStart>0&&moduleEnd>moduleStart);
const stockModule=html.slice(moduleStart,moduleEnd).replace(
 "})(typeof globalThis!=='undefined'?globalThis:this);","})(root);");
const root={MorphospaceCaptureShare:{validatePayload(value){
 if(!value?.record?.id)throw Error('個体IDが不正です');
 return value;
}}};
vm.runInNewContext(stockModule,{root,console});
const Stock=root.MorphospaceStock;
const valid={payload:{version:1,record:{id:'captured-sample',name:'標本'}},preview:'',
 updatedAt:'2026-10-31T01:00:00.000Z'};

function indexedDBFake(rows=[],{throwPut=false}={}){
 const values=new Map(rows.map(row=>[row.id,row]));
 const state={values,abortCount:0,uncaught:[]};
 const db={
  close(){},transaction(){
   let pending=0,aborted=false,completed=false;
   const tx={
    oncomplete:null,onabort:null,onerror:null,error:null,
    abort(){aborted=true;state.abortCount++;queueMicrotask(()=>tx.onabort?.())},
    objectStore(name){
     const request=fn=>{
      pending++;const r={result:undefined,error:null,onsuccess:null,onerror:null};
      queueMicrotask(()=>{
       if(aborted)return;
       try{fn(r);r.onsuccess?.({target:r})}catch(error){state.uncaught.push(error)}
       pending--;
       queueMicrotask(()=>{
        if(!aborted&&!completed&&pending===0){completed=true;tx.oncomplete?.()}
       });
      });
      return r;
     };
     return {
      get(id){return request(r=>r.result=values.get(id))},
      getAll(){return request(r=>r.result=[...values.values()])},
      put(value){
       if(throwPut)throw Object.assign(new Error('Safari cannot clone this entry'),{name:'DataCloneError'});
       values.set(value.id||name,value);
       return request(r=>r.result=value);
      },
      delete(id){values.delete(id);return request(r=>r.result=undefined)}
     };
    }
   };
   return tx;
  }
 };
 const factory={open(){const r={result:db,error:null};queueMicrotask(()=>r.onsuccess?.());return r;}};
 return {factory,state};
}

test('Safari request callback failures abort with their original cause rather than uncaught event errors',async()=>{
 const fake=indexedDBFake([],{throwPut:true});
 const store=Stock.createStore(()=>fake.factory);
 await assert.rejects(store.save(valid),/生体サンプルの書き込み：DataCloneError.*Safari cannot clone/);
 assert.equal(fake.state.abortCount,1);
 assert.deepEqual(fake.state.uncaught,[]);
 assert.equal(fake.state.values.size,0);
});

test('legacy malformed records remain on disk without aborting the valid specimen list',async()=>{
 const good=Stock.normalizeEntry(valid),legacy={id:'old-legacy',payload:{version:1,record:{}}};
 const fake=indexedDBFake([good,legacy]);
 const store=Stock.createStore(()=>fake.factory);
 const entries=await store.list();
 assert.equal(entries.length,1);assert.equal(entries[0].id,good.id);
 assert.equal(store.readIssues().length,1);
 assert.equal(store.readIssues()[0].id,legacy.id);
 assert.equal(fake.state.values.has(legacy.id),true,'never delete unreadable archived DNA');
 assert.deepEqual(fake.state.uncaught,[]);
});

test('a committed capture is not reported as failed if the specimen list refresh fails',async()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const main=scripts[2],start=main.indexOf('async function saveCaptureToStock('),
  end=main.indexOf('async function exportStock(',start);
 assert.ok(start>0&&end>start);
 const ui={};const $=id=>ui[id]||(ui[id]={
  textContent:'',disabled:false,hidden:true,
  classList:{toggle(){},add(){},remove(){}}
 });
 const context=vm.createContext({
  $,captureShareSequence:7,stockStore:{save:async()=>({created:true}),readIssues:()=>[]},
  refreshStock:async()=>{throw Error('old row failed')},console
 });
 vm.runInContext(main.slice(start,end),context);
 const state={stockPayload:valid.payload};
 assert.equal(await context.saveCaptureToStock(state,7),true);
 assert.equal(state.stockSaved,true);
 assert.equal($('retryStock').hidden,true);
 assert.match($('captureStockStatus').textContent,/保存しました/);
 assert.match($('captureStockStatus').textContent,/一覧の更新のみ失敗/);
});
