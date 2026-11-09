const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
test('ambient hearing defaults off and always releases permission tracks',()=>{
 assert.match(html,/id="viewerMic" type="checkbox"/);
 assert.match(html,/getUserMedia\(\{audio:/);
 assert.match(html,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(html,/function stopBioticAudio[\s\S]*?stopAmbientSense\(\);/);
 assert.match(html,/document\.hidden\)\{releaseBioticWakeLock\(\);stopAmbientSense/);
});
test('hearing adapts existing voice, chorus pulse, and movement',()=>{
 assert.match(html,/const ambient=ambientSense\.active\?ambientSense\.response\(sp\):null/);
 assert.match(html,/state\.grooveNote=\(seed\+ambientSense\.onsetSerial\)%4/);
 assert.match(html,/const response=typeof ambientSense!=='undefined'\?ambientSense\.motionFactor\(spec\):1/);
 assert.match(html,/node\.velocity=clamp\(node\.velocity\+ambientSense\.response/);
 assert.match(html,/amp\.connect\(engine\.sampleInput\)/);
 assert.doesNotMatch(html,/amp\.connect\(engine\.reverbInput\)/);
});
test('the environmental ear uses bounded pitch and inherited identity',()=>{
 const a=html.indexOf('function ambientEstimatePitch'),b=html.indexOf('const ambientSense={');
 assert.ok(a>0&&b>a);
 const sandbox={clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),soundMusicalProfile:()=>({root:57,scale:[0,2,4,5,7,9,11]})};
 vm.runInNewContext(html.slice(a,b)+'\nthis.quant=ambientConsonantRate;this.traits=ambientTraits;this.pitch=ambientEstimatePitch;',sandbox);
 for(const f of [110,220,330,440,800,1200]){const rate=sandbox.quant(f,{seed:1268});assert.ok(rate===null||(rate>=.74&&rate<=1.34));}
 assert.equal(sandbox.quant(NaN,{seed:1268}),null);
 const silence=new Float32Array(4096);
 for(const rate of [44100,48000])for(const hz of [110,130.81,164.81,196,220,261.63,329.63,392,440,523.25,659.25,783.99]){
  const wave=new Float32Array(4096);
  for(let i=0;i<wave.length;i++){
   const p=2*Math.PI*hz*i/rate;
   wave[i]=.3*Math.sin(p)+.12*Math.sin(2*p+.33)+.07*Math.sin(3*p+.8);
  }
  const found=sandbox.pitch(wave,rate);
  assert.ok(found!==null&&Math.abs(found-hz)/hz<.015,'fundamental at '+hz+' Hz / '+rate+' samples, got '+found);
 }
 assert.equal(sandbox.pitch(silence,48000),null);
 assert.equal(sandbox.traits({seed:1268}).reflex,sandbox.traits({seed:1268}).reflex);
});


test('iPhone microphone capture resets playback-only AudioSession before getUserMedia',async()=>{
 const start=html.indexOf('async function startAmbientSense(){'),end=html.indexOf('function stopAmbientSense(',start);
 assert.ok(start>=0&&end>start);
 const elements={viewerMic:{checked:true},viewerMicStatus:{textContent:''}};
 let observedType='',stops=0;
 const session={type:'playback'};
 const stream={getTracks(){return[{stop(){stops++;}}]}};
 const source={connect(){},disconnect(){}};
 const analyser={fftSize:4096,frequencyBinCount:2048,connect(){},disconnect(){}};
 const ctx={sampleRate:48000,destination:{},createMediaStreamSource(){return source;},createAnalyser(){return analyser;},createGain(){return{gain:{value:0},connect(){},disconnect(){}};}};
 const navigator={audioSession:session,mediaDevices:{
  async getUserMedia(){observedType=session.type;
   if(observedType==='playback')throw Object.assign(Error('AudioSession category is not compatible with audio capture'),{name:'InvalidStateError'});
   return stream;
  }
 }};
 const ambientSense={active:false,starting:false,revision:0,onsetSerial:0};
 const f={navigator,ambientSense,bioticAudio:{engine:{context:ctx}},bioticAudioRunning:()=>true,
  $:id=>elements[id],Float32Array,Object,console};
 vm.createContext(f);vm.runInContext(html.slice(start,end)+'this.startAmbientSense=startAmbientSense;',f);
 await f.startAmbientSense();
 assert.equal(observedType,'auto');
 assert.equal(session.type,'auto');
 assert.equal(ambientSense.active,true);
 assert.equal(stops,0);
 assert.match(elements.viewerMicStatus.textContent,/聴覚作動中/);
 const outputStart=html.slice(html.indexOf('async function startBioticAudio(){'),html.indexOf('function maybeStartBioticAudio(',html.indexOf('async function startBioticAudio(){')));
 assert.match(outputStart,/const microphoneRequested=/);
 assert.match(outputStart,/microphoneRequested\?'auto':'playback'/);
});
test('microphone capture failure returns audio session to playback',async()=>{
 const start=html.indexOf('async function startAmbientSense(){'),end=html.indexOf('function stopAmbientSense(',start);
 const elements={viewerMic:{checked:true},viewerMicStatus:{textContent:''}};
 const audioSession={type:'playback'};
 const navigator={audioSession,mediaDevices:{
  getUserMedia(){throw Object.assign(Error('No input device'),{name:'NotReadableError'});}
 }};
 const ambientSense={active:false,starting:false,revision:0,onsetSerial:0};
 const f={navigator,ambientSense,bioticAudioRunning:()=>true,$:id=>elements[id],console};
 vm.createContext(f);vm.runInContext(html.slice(start,end)+'this.startAmbientSense=startAmbientSense;',f);
 await f.startAmbientSense();
 assert.equal(audioSession.type,'playback');
 assert.equal(elements.viewerMic.checked,false);
 assert.equal(ambientSense.starting,false);
 assert.match(elements.viewerMicStatus.textContent,/No input device/);
});

test('sampled microaudio feeds inherited music notes via shared limiter',()=>{
 const hearing=html.slice(html.indexOf('const ambientSense={'),html.indexOf('async function startAmbientSense(){'));
 assert.match(html,/analyser\.fftSize=8192/);
 assert.match(hearing,/this\.captureAt=t\+\.12/);
 assert.match(hearing,/const pitch=ambientEstimatePitch\(clip,ctx\.sampleRate\)/);
 assert.match(hearing,/this\.adopt\(candidate,spec,ctx,t\)/);
 assert.match(hearing,/voice\.playbackRate\.value=clamp\(frequency\/detected,\.20,10\)/);
 assert.match(hearing,/res\.frequency\.setValueAtTime\(frequency,at\)/);
 assert.match(hearing,/amp\.connect\(engine\.sampleInput\)/);
 assert.doesNotMatch(hearing,/amp\.connect\(engine\.reverbInput\)/);
 assert.match(hearing,/this\.playMotifs\(spec,t\)/);
});
test('sample-only gain normalization has a bounded peak and leaves the base volume untouched',()=>{
 const start=html.indexOf('function ambientClipNormalizer('),end=html.indexOf('const ambientSense={',start);
 assert.ok(start>0&&end>start);
 const source=html.slice(start,end);
 const ctx=vm.createContext({});
 vm.runInContext(source+'this.normalize=ambientClipNormalizer;',ctx);
 const silence=new Float32Array(8192);
 assert.equal(ctx.normalize(silence),null);
 const noiseOnly=new Float32Array(8192);
 for(let i=0;i<noiseOnly.length;i++)noiseOnly[i]=.01*Math.sin(i*Math.PI*2*220/48000);
 assert.equal(ctx.normalize(noiseOnly),null,'very quiet mic noise should not be amplified');
 for(const amplitude of [.025,.04,.12,.4,.8]){
  const sample=new Float32Array(8192);
  for(let i=0;i<sample.length;i++)sample[i]=amplitude*Math.sin(i*Math.PI*2*220/48000);
  const n=ctx.normalize(sample);
  assert.ok(n&&n.multiplier>0&&n.multiplier<=14);
  assert.ok(n.peak*n.multiplier<=.880001,'never exceed normalised source ceiling');
 }
 const hearing=html.slice(html.indexOf('const ambientSense={'),html.indexOf('async function startAmbientSense(){'));
 assert.doesNotMatch(hearing,/engine\.output\.gain/);
 assert.doesNotMatch(hearing,/state\.master\.gain/);
});
test('mic timbre returns to neutral when the environment is silent',()=>{
 const start=html.indexOf('const ambientSense={'),end=html.indexOf('async function startAmbientSense(){',start);
 const sense=html.slice(start,end);
 assert.match(sense,/timbre:clamp\(\(this\.level\*\.9\+this\.pulse\*\.35\)/);
 assert.match(sense,/this\.level\+=/);
 assert.match(sense,/this\.pulse\*=\.88/);
 assert.doesNotMatch(sense,/timbre:this\.brightness\*gain\*traits\.colour/);
});

test('characteristic acoustic identity, pitch and novelty determine motif selection',()=>{
 const start=html.indexOf('function ambientClipNormalizer('),end=html.indexOf('const ambientSense={',start);
 const source=html.slice(start,end);
 const f={clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v))};
 vm.createContext(f);
 vm.runInContext(source+'\nthis.features=ambientMotifFeatures;this.distance=ambientMotifDistance;',f);
 const wave=new Float32Array(8192);
 for(let i=0;i<wave.length;i++)wave[i]=.19*Math.sin(2*Math.PI*220*i/48000)*(i<wave.length/2?.4:1);
 const a=f.features(wave,220),b=f.features(wave,440),c=f.features(wave,220);
 assert.ok(a&&a.score>.30);
 assert.equal(f.distance(a,c),0);
 assert.ok(f.distance(a,b)>.35);
 assert.equal(f.features(new Float32Array(8192),null),null);
});
test('two retained memory lanes repeat, stage replacements and fade old motifs',()=>{
 const start=html.indexOf('const ambientSense={'),end=html.indexOf('async function startAmbientSense(){',start);
 const source=html.slice(start,end);
 const sandbox={
  ambientMotifDistance:(a,b)=>Math.abs(a.texture-b.texture)+Math.abs(a.motion-b.motion)+
   (a.pitch&&b.pitch?Math.min(1,Math.abs(Math.log2(a.pitch/b.pitch))):.5),
  ambientClipNormalizer:()=>({rms:.16,peak:.3,multiplier:1}),
  ambientTraits:()=>({latency:.07}),
  clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),
  $:()=>({value:50}),
  bioticAudioRunning:()=>true,
  bioticAudio:{engine:{sampleInput:{},context:{}}},
  Float32Array
 };
 vm.createContext(sandbox);
 vm.runInContext(source+'\nthis.ear=ambientSense;',sandbox);
 const ear=sandbox.ear;
 const ctx={sampleRate:48000,createBuffer:(channels,len)=>({duration:len/48000,getChannelData:()=>new Float32Array(len)})};
 const specimen={seed:7654321};
 const candidate=(pitch,motion,texture,score)=>({wave:new Float32Array(4096),pitch,features:{pitch,motion,texture,score,rms:.15}});
 assert.equal(ear.adopt(candidate(220,.3,.1,.68),specimen,ctx,0),true);
 assert.equal(ear.adopt(candidate(440,.9,.9,.91),specimen,ctx,1),true);
 assert.equal(ear.motifs.length,2);
 assert.equal(ear.adopt(candidate(660,.1,.5,.89),specimen,ctx,4),false,'hold distinct motifs long enough');
 assert.equal(ear.adopt(candidate(660,.1,.5,.89),specimen,ctx,22),true,'replace after minimum hold');
 assert.equal(ear.motifs.filter(m=>m.retireAt<0).length,2);
 assert.equal(ear.motifs.filter(m=>m.retireAt>=0).length,1);
 assert.equal(ear.replacedCount,1);
 assert.ok(ear.motifs.some(m=>m.until===27.2));
 ear.motifs=ear.motifs.filter(m=>m.until>28);
 assert.equal(ear.motifs.length,2);
});
test('processed sample instruments preserve the original heartbeat and star bus',()=>{
 const hearing=html.slice(html.indexOf('const ambientSense={'),html.indexOf('async function startAmbientSense(){'));
 assert.match(hearing,/hp\.type='highpass'/);
 assert.match(hearing,/bp\.type='bandpass'/);
 assert.match(hearing,/saturation\.curve=curve/);
 assert.match(hearing,/lp\.type='lowpass'/);
 assert.match(hearing,/motif\.step\+\+/);
 assert.match(hearing,/weightIn\*weightOut/);
 assert.match(hearing,/this\.motifs\.filter\(m=>now<m\.until\)/);
 assert.match(hearing,/amp\.connect\(engine\.sampleInput\)/);
 assert.doesNotMatch(hearing,/state\.master\.gain/);
 assert.match(html,/if\(ambientSense\.active\)quiet=true;/);
 assert.match(html,/updateHeartbeat\(individuals,quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
 assert.match(html,/amp\.connect\(ctx\.destination\);amp\.connect\(engine\.snowRecordingTap\)/);
});
test('100 Hz bass detection and quieter capture thresholds',()=>{
 const a=html.indexOf('function ambientEstimatePitch('),b=html.indexOf('function ambientConsonantRate(',a);
 const sandbox={clamp:(x,lo,hi)=>Math.max(lo,Math.min(hi,x))};
 vm.createContext(sandbox);
 vm.runInContext(html.slice(a,b)+'this.pitch=ambientEstimatePitch;',sandbox);
 for(const rate of [44100,48000])for(const hz of [90,95,100,110,220,440]){
  const wave=new Float32Array(Math.floor(rate*.17));
  for(let i=0;i<wave.length;i++)wave[i]=.3*Math.sin(i*2*Math.PI*hz/rate);
  const detected=sandbox.pitch(wave,rate);
  assert.ok(detected&&Math.abs(detected-hz)/hz<.025,rate+' rate '+hz+'Hz source: '+detected);
 }
 assert.match(html,/const floor=Math\.max\(\.008,this\.noise\*2\.0\)/);
 assert.match(html,/rms>this\.previous\*1\.13&&rms-this\.previous>\.003/);
 assert.match(html,/if\(rms<\.004\|\|peak<\.012\)return null/);
});
test('original vocal layers expose MIDI and sampled voice triggers',()=>{
 const ear=html.slice(html.indexOf('const ambientSense={'),html.indexOf('async function startAmbientSense(){'));
 assert.match(html,/layer\.micCallStrength=envelope\*shape\.voiced/);
 assert.match(html,/layer\.micCallKey=phrase\+':'\+activeStep/);
 assert.match(ear,/const voiceBank=bioticAudio\.engine\.voices/);
 assert.match(ear,/layer\.micCallStrength<\.17/);
 assert.match(ear,/layer\.micLastCallKey===layer\.micCallKey/);
 assert.match(ear,/const frequency=440\*Math\.pow\(2,\(layer\.noteMidi-69\)\/12\)/);
 assert.doesNotMatch(ear,/const heard=this\.period>/);
});
test('microphone is exclusive music source while heartbeat and star sounds are unchanged',()=>{
 const ear=html.slice(html.indexOf('const ambientSense={'),html.indexOf('async function startAmbientSense(){'));
 assert.match(ear,/voice\.loop=true/);
 assert.match(ear,/amp\.gain\.linearRampToValueAtTime\(gain,middle\)/);
 assert.match(ear,/amp\.gain\.linearRampToValueAtTime\(0,endAt\)/);
 assert.match(ear,/amp\.connect\(engine\.sampleInput\)/);
 assert.match(html,/function updatePureChoir\(quiet=false\)\{[\s\S]*?if\(ambientSense\.active\)quiet=true;/);
 assert.match(html,/try\{engine\.update\(individuals,0\);updatePureChoir\(quiet\)/);
 assert.doesNotMatch(ear,/state\.master\.gain/);
});

