'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const source=html.slice(html.indexOf('async function bootMorphospace(){'),html.indexOf("\n\n$('recordVideo')"));
function harness({payload=null,error=null,gpu=true,selection=-1}={}){
 const fields={seed:{value:''},message:{textContent:''}},calls=[];
 const ctx={stockReady:Promise.resolve(),location:{hash:''},Math:Object.create(Math),gl:gpu,renderer:gpu,population:[],selected:selection,
 $:id=>fields[id],CaptureShare:{fromHash(){if(error)throw error;return payload}},
 async restoreSharedSpecimen(p){calls.push(['share',p])},
 async build(seed){calls.push(['build',seed]);ctx.population=[{}]},loadSpecimen(i){calls.push(['open',i])}};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,fields,calls};
}
test('fresh visits choose new seeds and open the generated specimen',async()=>{
 const h=harness();h.ctx.Math.random=()=>.1;await h.ctx.bootMorphospace();
 assert.equal(h.fields.seed.value,'189999');assert.deepEqual(h.calls,[['build',189999],['open',0]]);
 h.ctx.Math.random=()=>.9;await h.ctx.bootMorphospace();assert.equal(h.fields.seed.value,'909999');
 assert.doesNotMatch(html,/id="seed" value="731029"/);
});
test('shared DNA takes priority over random startup',async()=>{
 const payload={record:{seed:42}},h=harness({payload});await h.ctx.bootMorphospace();assert.deepEqual(h.calls,[['share',payload]]);
});
test('invalid shares fall back to a fresh viewer while explaining the failure',async()=>{
 const h=harness({error:new Error('invalid DNA')});await h.ctx.bootMorphospace();assert.equal(h.calls[1][0],'open');assert.match(h.fields.message.textContent,/invalid DNA/);
});
test('unavailable WebGL keeps the gallery usable without opening a viewer',async()=>{
 const h=harness({gpu:false});await h.ctx.bootMorphospace();assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'build');
});
test('a specimen selected while building is not replaced on completion',async()=>{
 const h=harness({selection:3});await h.ctx.bootMorphospace();assert.equal(h.calls.length,1);
});
