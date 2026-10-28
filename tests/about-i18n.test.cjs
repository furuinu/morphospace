'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=fs.readFileSync(path.join(root,'about-i18n.js'),'utf8');
const keys=['title','intro','purpose','name','qualiaHeading','qualiaDefinition','qualiaWorld',
 'beingHeading','alone','heartbeat','encounter','existence','understand','listen','wonder','signature'];
function harness(storage=new Map()){
 const nodes=Object.fromEntries(keys.map(key=>[key,{innerHTML:'original-'+key,textContent:'original-'+key}]));
 let handler=null;
 const select={value:'ja',addEventListener(type,fn){assert.equal(type,'change');handler=fn}};
 const control={hidden:true},scroll={scrollTop:50};
 const dialog={lang:'ja',getAttribute(){return null},
  querySelector(selector){
   if(selector==='.about-document')return scroll;
   const match=selector.match(/^\[data-about-key="([^"]+)"\]$/);
   return match?nodes[match[1]]:null;
  }};
 const window={localStorage:{
  getItem(key){return storage.get(key)||null},
  setItem(key,value){storage.set(key,value)}
 }};
 const document={getElementById(id){
  if(id==='aboutDialog')return dialog;
  if(id==='aboutLanguageControl')return control;
  if(id==='aboutLanguage')return select;
  return null;
 }};
 vm.runInNewContext(source,{window,document});
 return {window,nodes,dialog,control,select,scroll,change:()=>handler()};
}
test('the original Japanese introduction and the full signed poetic ending remain in the HTML fallback',()=>{
 assert.match(html,/<script src="about-i18n\.js" defer><\/script>/);
 assert.match(html,/甘さに、形があるとしたら。<br>香りが、生きものとして動き出したら。/);
 assert.match(html,/この世界では、そうした感覚を手がかりに、色、模様、骨格、質感、動きを組み合わせ、生物の姿を想像します。/);
 assert.match(html,/一期一会。宇宙にひとつだけの生命体。/);
 assert.match(html,/ぼんやりとその姿を眺め、彼らの聲に耳を傾ける。/);
 assert.match(html,/マサラキッチン店主：三辻　忍/);
 assert.deepEqual([...html.matchAll(/data-about-key="([^"]+)"/g)].map(m=>m[1]),keys);
});
test('all 13 About languages are selectable, translated, and reset to Japanese',()=>{
 const h=harness();
 assert.equal(h.control.hidden,false);
 const codes=Array.from(h.window.MorphospaceAboutI18n.languages);
 assert.deepEqual(codes,['ja','en','zh-TW','ko','zh-CN','fr','it','de','ru','th','vi','pt','es']);
 for(const language of codes.slice(1)){
  h.window.MorphospaceAboutI18n.render(language);
  assert.equal(h.dialog.lang,language);
  assert.equal(h.select.value,language);
  for(const key of keys)assert.ok(h.nodes[key].textContent.length>4,language+' missing '+key);
 }
 h.window.MorphospaceAboutI18n.render('ja');
 for(const key of keys)assert.equal(h.nodes[key].innerHTML,'original-'+key);
});
test('language selection updates content and persists across openings',()=>{
 const state=new Map();
 const h=harness(state);
 h.select.value='fr';h.change();
 assert.equal(h.dialog.lang,'fr');
 assert.equal(h.scroll.scrollTop,0);
 assert.equal(state.get('morphospace.about.language'),'fr');
 const next=harness(state);
 assert.equal(next.dialog.lang,'fr');
 assert.match(next.nodes.signature.textContent,/Shinobu Mitsuji/);
});
test('without storage permissions the language menu still works',()=>{
 const h=harness();
 // Browsers with denied storage access should be gracefully handled.
 const unsafeSource=source.replace('const storeKey=',"window.localStorage={getItem(){throw Error('denied')},setItem(){throw Error('denied')}}; const storeKey=");
 assert.ok(unsafeSource.includes("throw Error('denied')"));
 const nodes=Object.fromEntries(keys.map(k=>[k,{innerHTML:'ja',textContent:'ja'}]));
 const select={value:'ja',addEventListener(){}},control={hidden:true};
 const document={getElementById(id){
  if(id==='aboutDialog')return {lang:'ja',querySelector(q){const match=q.match(/^\[data-about-key="([^"]+)"\]$/);return match?nodes[match[1]]:null},getAttribute(){return null}};
  if(id==='aboutLanguageControl')return control;
  if(id==='aboutLanguage')return select;
  return null;
 }};
 vm.runInNewContext(unsafeSource,{window:{},document});
 assert.equal(control.hidden,false);
});
