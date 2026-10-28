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
 const ctx={currentTime:0,createGain(){allocated++;return node()},createBiquadFilter(){return Object.assign(node(),{type:'highpass'})}};
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
 assert.ok(scripts.some(block=>block.trim()===src.trim()),'XServer HTML-only deployment must embed the exact voice module');
 assert.ok(!html.includes('src="./voice-styles.js'),'external voice module will be missing from XServer');
 const reaction=fs.readFileSync(path.join(base,'surface-reaction.js'),'utf8');
 assert.ok(scripts.some(block=>block.trim()===reaction.trim()),'XServer HTML-only deployment must embed the reaction module');
 assert.ok(!html.includes('src="./surface-reaction.js'),'external reaction module will be missing from XServer');
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
 assert.ok(f.state.lights[0].directTone.gain.value>.65);
 assert.equal(f.engine.applied(f.state),'cetacean');
 assert.ok(f.state.body.directTone.gain.value>.35);
});
test('hot switching restores original timbre without allocating new oscillators',()=>{
 const f=fixture();
 f.setMode('cetacean');
 for(let i=0;i<80;i++){f.ctx.currentTime=i*.04;f.engine.apply(f.state,{seed:42},f.ctx,i*.1,.2,.7,()=>.9,{phraseLength:4})}
 assert.equal(f.allocated(),12,'six voices x clean fundamental and upper harmonic, allocated once');
 f.setMode('gregorian');f.engine.apply(f.state,{seed:42},f.ctx,11,.3,.7,()=>.8,{phraseLength:4});
 assert.equal(f.state.lights[0].exciter.type,'sawtooth');
 assert.equal(f.engine.applied(f.state),'gregorian');
 f.setMode('original');f.engine.apply(f.state,{seed:42},f.ctx,12,.3,.7,()=>.8,{phraseLength:4});
 assert.equal(f.state.lights[0].directTone.gain.value,0);
 assert.equal(f.state.ambience.roomWet.gain.value,.43);
 assert.equal(f.state.lights[0].directOvertone.gain.value,0);
 assert.equal(f.allocated(),12);
});

test('chant and hymn have distinct audible source waveforms, direct fundamentals and start a new phrase on switch',()=>{
 const f=fixture();const voices=[f.state.body,f.state.pulse,...f.state.lights];
 const settings={seed:4242},blink=()=>.7,character={phraseLength:4};
 f.setMode('gregorian');f.engine.apply(f.state,settings,f.ctx,25,.2,.5,blink,character);
 assert.ok(voices.every(v=>v.directTone.gain.value===0),'human chant must not leak raw oscillator into speakers');
 assert.ok(voices.some(v=>v.consonantGain?.gain.value>0),'human vocal breath must be present');
 assert.ok(voices.every(v=>v.exciter.type==='sawtooth'));
 const chantPitch=f.state.body.exciter.frequency.value;
 f.setMode('hymn');f.engine.apply(f.state,settings,f.ctx,26,.2,.5,blink,character);
 assert.equal(f.state.body.exciter.type,'triangle');
 assert.ok(voices.slice(0,4).every(v=>v.directTone.gain.value>.25));
 assert.notEqual(chantPitch,f.state.body.exciter.frequency.value);
 f.setMode('sutra');f.engine.apply(f.state,settings,f.ctx,27,.2,.5,blink,character);
 assert.equal(f.state.body.exciter.type,'sawtooth');
 assert.ok(voices.slice(0,4).every(v=>v.directTone.gain.value>.25));
 assert.equal(f.state.generatedStyleEpoch,27);
 f.engine.apply(f.state,settings,f.ctx,30,.2,.5,blink,character);
 assert.equal(f.state.generatedStyleEpoch,27,'do not restart phrase every synthesis frame');
});

test('presets remain below original master gain and chants use vowel formants instead of a raw buzzer',()=>{
 const f=fixture(),seed={seed:32901},dna={phraseLength:3.4,vibrato:.6};
 assert.equal(f.engine.gainFor('original'),.95);
 for(const style of ['gregorian','cetacean','hymn','sutra']){
  assert.ok(f.engine.gainFor(style)<f.engine.gainFor('original'),'preset must not exceed original master gain');
  f.setMode(style);
  f.engine.apply(f.state,seed,f.ctx,0.8,.1,.5,()=>.6,dna);
  assert.equal(f.engine.applied(f.state),style);
  if(style==='gregorian'||style==='sutra'){
   for(const v of [f.state.body,f.state.pulse,...f.state.lights])
    assert.equal(v.directTone.gain.value,0,'no unfiltered fundamental bypass');
   assert.ok(f.state.body.voicingGain===undefined||f.state.body.voicingGain.gain.value>0);
  }
 }
 f.setMode('original');f.engine.apply(f.state,seed,f.ctx,5,.1,.5,()=>.6,dna);
 assert.equal(f.state.body.directTone.gain.value,0);
});
