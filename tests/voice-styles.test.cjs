'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(base,'voice-styles.js'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
function fixture(){
 let mode='original',writes=[],allocated=0;
 const parameter=()=>({value:0,setTargetAtTime(v,t,tau){
  assert.ok(Number.isFinite(v)&&Number.isFinite(t)&&Number.isFinite(tau)&&tau>0,JSON.stringify({v,t,tau}));
  this.value=v;writes.push(v);
 }});
 const node=()=>({connect(){},out:{gain:parameter()},gain:parameter(),frequency:parameter()});
 const voice=()=>({
  out:node(),exciter:Object.assign(node(),{type:'sawtooth'}),oscillators:[1,2,3].map(h=>({h,osc:node()})),
  voicingGain:node(),exciterGain:node(),consonantGain:node(),nasalGain:node(),
  tone:node(),formants:[node(),node(),node()],
  vowelBands:[[810,1260,2800],[520,1680,2510],[340,1990,2760],[540,1040,2460],[390,950,2350]]
 });
 const state={body:voice(),pulse:voice(),lights:Array.from({length:4},voice),
  ambience:{roomWet:node(),echoWet:node(),echoFeedback:node(),dry:node()},
  comfortLowpass:node(),rhythm:{highpass:node(),lowpass:node(),wet:node(),dry:node()}};
 state.body.acid={wet:node(),dry:node()};
 const ctx={currentTime:0,createGain(){allocated++;return node()}};
 const page={getElementById(id){assert.equal(id,'viewerVoiceStyle');return{value:mode}}};
 const sandbox={window:{},document:page};
 vm.runInNewContext(src,sandbox,{filename:'voice-styles.js'});
 return{engine:sandbox.window.MorphVoiceStyles,state,ctx,writes,allocated:()=>allocated,setMode(next){mode=next}};
}
test('voice module and legacy inline script arrangement compile and remain stable',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.ok(scripts[2].includes('function renderPureChoir('),'existing third inline script remains the generator');
 for(const source of scripts)if(source.trim())assert.doesNotThrow(()=>new vm.Script(source));
 assert.ok(html.includes('src="./voice-styles.js"'));
 assert.ok(html.includes('id="viewerVoiceStyle"'));
 assert.ok(html.includes('morphospace-voice-style-v1'));
 assert.match(html,/MorphVoiceStyles\.apply\(state,sp,ctx,t,wave,coupling,blink,voiceDNA\)/);
});
test('all five style IDs are valid and the original is selected by default',()=>{
 const f=fixture();
 assert.deepEqual(Object.keys(f.engine.INFO).sort(),['cetacean','gregorian','hymn','original','sutra'].sort());
 assert.equal(f.engine.current(),'original');
});
test('every synthesis style produces finite Web Audio targets across seeds and time',()=>{
 const f=fixture();
 for(const mode of ['original','gregorian','cetacean','hymn','sutra']){
  f.setMode(mode);
  for(const seed of [0,1,123,197311,4294967295]){
   for(let i=0;i<40;i++){
    f.ctx.currentTime=i*.04;
    f.engine.apply(f.state,{seed},f.ctx,i*.15,Math.sin(i*.4),.5+(i%3)*.25,n=>Math.abs(Math.sin(n+i*.07)),{phraseLength:2.5+i%5});
   }
  }
 }
 assert.ok(f.writes.length>10000);
});
test('modes yield different pitches and keep whistles within a safe audible range',()=>{
 const f=fixture(),result={};
 for(const mode of ['gregorian','hymn','sutra','cetacean']){
  f.setMode(mode);f.ctx.currentTime=20;
  f.engine.apply(f.state,{seed:1234567},f.ctx,9.1,.4,.7,()=>.7,{phraseLength:5});
  result[mode]=[f.state.body.exciter.frequency.value,f.state.lights[0].exciter.frequency.value];
 }
 assert.equal(new Set(Object.values(result).map(x=>x.join(','))).size,4);
 assert.ok(result.cetacean[1]>=670&&result.cetacean[1]<=2600);
 assert.equal(f.state.lights[0].exciter.type,'sine');
 assert.ok(f.state.lights[0].directTone.gain.value>0);
});
test('hot switching restores original timbre without allocating new oscillators',()=>{
 const f=fixture();
 f.setMode('cetacean');
 for(let i=0;i<80;i++){f.ctx.currentTime=i*.04;f.engine.apply(f.state,{seed:42},f.ctx,i*.1,.2,.7,()=>.9,{phraseLength:4})}
 assert.equal(f.allocated(),4,'only four direct gains, allocated once');
 f.setMode('gregorian');f.engine.apply(f.state,{seed:42},f.ctx,11,.3,.7,()=>.8,{phraseLength:4});
 assert.equal(f.state.lights[0].exciter.type,'sawtooth');
 f.setMode('original');f.engine.apply(f.state,{seed:42},f.ctx,12,.3,.7,()=>.8,{phraseLength:4});
 assert.equal(f.state.lights[0].directTone.gain.value,0);
 assert.equal(f.state.ambience.roomWet.gain.value,.43);
 assert.equal(f.allocated(),4);
});
