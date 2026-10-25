const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2];
test('every inline JavaScript block compiles before deployment',()=>{
 for(let i=0;i<scripts.length;i++)assert.doesNotThrow(()=>new vm.Script(scripts[i],{filename:'index.html inline script '+i}));
});
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(src.slice(0,src.indexOf("const canvas=$('glview'),gl=")),ctx);
vm.runInContext(src.slice(src.indexOf('function createBioticAudioEngine('),src.indexOf('const bioticAudio=')),ctx);
// Motion-driven arpeggios share the production waveform sampler, defined after the audio engine.
vm.runInContext(src.slice(src.indexOf('function organismMotionPickups('),src.indexOf('function newPureChoirState(')),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
function graph(){
 const nodes=[],parameters=[];const parameter=()=>{const p={value:0,events:[],cancelScheduledValues(time){assert.ok(Number.isFinite(time));this.events=this.events.filter(e=>e.time<time);return this},setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.events.push({value,time,type:'set'});return this},linearRampToValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.events.push({value,time,type:'ramp'});return this},setTargetAtTime(value,time,constant){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&constant>0,JSON.stringify({value,time,constant,stack:(new Error()).stack?.slice(0,1200)}));this.value=value;this.events.push({value,time,constant})}};parameters.push(p);return p};
 const node=(type)=>{const n={type,connections:[],disconnected:false,connect(other){this.connections.push(other);return other},disconnect(other){if(other)this.connections=this.connections.filter(x=>x!==other);else{this.connections=[];this.disconnected=true}}};nodes.push(n);return n};
 const source=type=>Object.assign(node(type),{frequency:parameter(),detune:parameter(),starts:[],stops:[],start(...args){assert.ok(args.every(Number.isFinite));this.starts.push(args)},stop(time){this.stops.push(time)}});
 const track={stops:0,stop(){this.stops++}};
 const context={currentTime:0,sampleRate:8000,state:'running',destination:node('destination'),createGain:()=>Object.assign(node('gain'),{gain:parameter()}),createBiquadFilter:()=>Object.assign(node('filter'),{frequency:parameter(),Q:parameter(),gain:parameter()}),createConvolver:()=>node('convolver'),createDelay:()=>Object.assign(node('delay'),{delayTime:parameter()}),createAnalyser:()=>Object.assign(node('meter'),{fftSize:2048,sample:0,getFloatTimeDomainData(a){a.fill(this.sample)}}),createDynamicsCompressor:()=>Object.assign(node('limiter'),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,parameter()]))),createBuffer:(channels,length,rate)=>{assert.equal(channels,1);return{getChannelData:()=>new Float32Array(length)}},createWaveShaper:()=>node('safety'),createOscillator:()=>source('oscillator'),createBufferSource:()=>source('noise'),createMediaStreamDestination:()=>Object.assign(node('recording'),{stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}})};
 return{context,nodes,parameters,track};
}
function specimen(seed){return{seed,genome:{soundDNA:plain(run(`soundFounderDNA(${seed})`))},biome:{nodes:[{pressure:.4,velocity:.2},{pressure:-.2,velocity:-.1}]}}}
test('individual piano grammars are distinct, reproducible and generate fresh phrases instead of looping a score',()=>{
 const result=run(`(()=>{const grammars=new Set();let evolving=0;for(let seed=1;seed<=128;seed++){const p=soundMusicalProfile({seed,genome:{soundDNA:soundFounderDNA(seed)}});grammars.add(JSON.stringify(p.pianoRules));const phrases=new Set();for(let phrase=0;phrase<8;phrase++){const a=soundPianoPhrase(p,phrase);if(JSON.stringify(a)!==JSON.stringify(soundPianoPhrase(p,phrase)))throw Error('unstable phrase');phrases.add(JSON.stringify(a));for(const e of a)if(e.midi<p.pianoRules.low||e.midi>p.pianoRules.low+p.pianoRules.span||e.length<=0)throw Error('invalid register');}if(phrases.size===8)evolving++;}return{grammars:grammars.size,evolving}})()`);
 assert.deepEqual(plain(result),{grammars:128,evolving:128});
});
test('changing the leap law changes interval statistics while retaining a finite evolving melody',()=>{
 const result=run(`(()=>{const seed=42,d=soundFounderDNA(seed),means=[];for(const leap of [0,1]){const p=soundMusicalProfile({seed,genome:{soundDNA:{...d,pianoLeap:leap,pianoMemory:0}}});let sum=0,count=0;for(let phrase=0;phrase<30;phrase++){const events=soundPianoPhrase(p,phrase);for(let i=1;i<events.length;i++){sum+=Math.abs(events[i].midi-events[i-1].midi);count++;}}means.push(sum/count);}return means})()`);
 assert.ok(result[1]>result[0]+1);
});
test('three piano slots retain bounded decays through phrase transitions without growing their cache',()=>{
 const p=ctx.soundMusicalProfile(specimen(42)),cache={index:-1};let active=0;
 for(let beat=0;beat<p.pianoRules.phraseBeats*5;beat+=.071){const notes=ctx.soundPianoAt(p,beat,cache);assert.equal(notes.length,3);assert.ok(cache.events.length<=22&&cache.previous.length<=22);for(const note of notes){assert.ok(Number.isFinite(note.frequency)&&note.frequency>50&&note.frequency<2000);assert.ok(note.envelope>=0&&note.envelope<=1&&note.bright>=0&&note.bright<=1);if(note.envelope>.1)active++}}
 assert.ok(active>100);assert.equal(cache.index,4);
});
test('organisms produce 1-3 staggered calls in mid, upper-mid and high ranges',()=>{
 const counts=new Set();
 for(const seed of [42,731029,571938,856123,197311,9473,91275,8675309,1008,77357]){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed);
  e.update([{sp,weight:1}],.5);const v=[...e.voices.values()][0];
  counts.add(v.voiceCount);assert.ok(v.voiceCount>=1&&v.voiceCount<=3);
  assert.equal(v.layers.length,3);assert.equal(v.sources.length,10);
  assert.ok(v.layers.every(layer=>layer.source.type==='sawtooth'&&layer.filters.length===3));
  assert.ok(v.sources.every(source=>source.starts.length===1));
  const initial=g.nodes.length,sounding=[0,0,0],overlap=[];
  for(let i=1;i<=280;i++){
   g.context.currentTime=i*.04;e.update([{sp,weight:1,visual:{motion:0}}],.5);
   assert.equal(g.nodes.length,initial);
   const values=v.layers.map(layer=>layer.gain.gain.value);
   overlap.push(values.filter(x=>x>.005).length);
   for(let k=0;k<3;k++){
    if(values[k]>.005)sounding[k]++;
    assert.ok(values[k]>=0&&values[k]<=.22);
    assert.ok(v.layers[k].source.frequency.value>=285&&v.layers[k].source.frequency.value<=710);
   }
  }
  assert.ok(sounding[0]>15);
  for(let k=v.voiceCount;k<3;k++)assert.equal(sounding[k],0);
  assert.ok(overlap.some(n=>n<=1));
  if(v.voiceCount>=2)assert.ok(overlap.some(n=>n>=2),'independent calls should occasionally overlap');
  const rec=e.recording();assert.equal(rec.track,g.track);rec.disconnect();e.silence();
  assert.ok(v.sources.every(source=>source.stops.length===1));v.sources[0].onended();
  assert.ok(v.nodes.every(node=>node.disconnected));
 }
 assert.ok(counts.size>=2);
});
test('body motion produces short one-voice calls and respects disabled motion',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(731029);
 sp.biome.nodes.forEach(n=>{n.pressure=0;n.velocity=0});
 e.update([{sp,weight:1,visual:{motion:0}}],.5);
 const v=[...e.voices.values()][0];assert.equal(v.gestureAt,-10);
 g.context.currentTime=1;sp.biome.nodes.forEach(n=>{n.pressure=1;n.velocity=1});
 e.update([{sp,weight:1,visual:{motion:0}}],.5);assert.equal(v.gestureAt,-10);
 g.context.currentTime=2;e.update([{sp,weight:1,visual:{motion:1}}],.5);
 assert.equal(v.gestureAt,2);assert.ok(v.gestureVoice>=0&&v.gestureVoice<v.voiceCount);
 g.context.currentTime=2.35;e.update([{sp,weight:1,visual:{motion:1}}],.5);
 assert.ok(v.layers[v.gestureVoice].gain.gain.value>0);
 g.context.currentTime=2.6;e.update([{sp,weight:1,visual:{motion:1}}],.5);assert.equal(v.gestureAt,2,'calls are throttled');
});
test('phoneme syllabary articulates nasal humming, consonant attacks and distinct vowels',()=>{
 const labels=new Set(),nasalLevels=[],airLevels=[],formants=new Set();
 for(const seed of [42,731029,571938,856123,197311]){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed);
  const firstNodes=g.nodes.length;
  for(let k=0;k<360;k++){
   g.context.currentTime=k*.06;
   e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
   const v=[...e.voices.values()][0];labels.add(v.layers[0].syllable);
   nasalLevels.push(v.layers[0].nasalGain.gain.value);
   airLevels.push(v.airGain.gain.value);
   formants.add(Math.round(v.layers[0].filters[1].frequency.value));
   if(k===0)sp.nodeCount=g.nodes.length;
   assert.equal(g.nodes.length,sp.nodeCount,'phonemes must reuse oscillator graph');
   assert.ok(v.layers.every(layer=>layer.vibratoDepth>=0&&layer.vibratoDepth<=.17));
  }
  assert.ok(g.nodes.length>=firstNodes);e.silence();
 }
 assert.ok(labels.size>=9,'several consonant-vowel syllables should be selected');
 assert.ok(nasalLevels.some(value=>value>.002),'m/n syllables should create humming');
 assert.ok(airLevels.some(value=>value>.008),'h/r/y should produce breath or attack');
 assert.ok(formants.size>10,'distinct vowels must have distinct resonant frequencies');
});
test('four GPU-phased light sites generate distinct resonant syllables with shared echo/reverb',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 let events=0;const history=[];
 for(let i=0;i<560;i++){
  const now=i*.025;g.context.currentTime=now;
  e.update([{sp,weight:1,visual:{time:now,motion:0,emission:{mode:i<20?0:2,strength:1,speed:1,seed:0}}}],.5);
  const v=[...e.voices.values()][0];
  if(i===0){
   assert.equal(v.lightVoices.length,4);assert.equal(v.skinVoices.length,2);
   assert.ok(v.lightVoices.every(p=>p.source.type==='sawtooth'&&p.filters.length===3));
   assert.ok(v.lightVoices.every(p=>p.filters.every(q=>q.type==='bandpass')));
   assert.ok(v.lightVoices.every(p=>p.filters.every(q=>q.connections.some(n=>n.type==='gain'))));
   assert.ok(v.lightVoices.every(p=>!p.source.connections.includes(e.output)));
   assert.ok(v.sum.connections.some(n=>n.type==='gain'));
  }
  if(i<20)assert.equal(v.blinkEvents,0);
  for(const site of v.lightVoices){
   assert.ok(site.amplitude>=0&&site.amplitude<=1.8);
   assert.ok(site.gain.gain.value>=0&&site.gain.gain.value<=.08);
  }
  const total=v.lightVoices.reduce((n,q)=>n+q.events,0);
  if(total>events){history.push({time:now,sites:v.lightVoices.map(x=>x.events)});events=total;}
 }
 const v=[...e.voices.values()][0];
 assert.ok(events>=8,'visible sharp flashes must generate multiple syllabic onsets');
 assert.ok(v.lightVoices.filter(part=>part.events>=2).length>=3,'each of the four phased emitters must call');
 assert.ok(history.length>=7);
 assert.ok(new Set(history.map(item=>item.sites.join(','))).size>=7);
 const reverb=v.nodes.find(x=>x.type==='convolver');assert.ok(v.sum.connections.includes(reverb));
});
test('slow breathing glows sustain vocal formants, while rapid flashes yield separated syllables',()=>{
 const strengths=[];
 for(const mode of [1,2,3,4,6]){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(731029);
  let longest=0,streak=0,onsets=0;
  for(let i=0;i<1000;i++){
   const now=i*.025;g.context.currentTime=now;
   e.update([{sp,weight:1,visual:{time:now,motion:0,emission:{mode,strength:1,speed:1,seed:0}}}],.5);
   const v=[...e.voices.values()][0],site=v.lightVoices[0];
   if(site.amplitude>.15){streak++;longest=Math.max(longest,streak);}else streak=0;
   onsets=site.events;
  }
  strengths.push({mode,longest:onsets>0?longest*.025:0,onsets});
 }
 assert.ok(strengths.find(x=>x.mode===1).longest>1,'slow swell should sustain a vowel for more than one second');
 assert.ok(strengths.find(x=>x.mode===2).onsets>=6,'fast blink pattern should yield repeated articulated calls');
 assert.ok(strengths.find(x=>x.mode===3).onsets>=5,'multiple flashes should produce a call sequence');
 assert.ok(strengths.find(x=>x.mode===6).onsets>=1,'binary flash must have a vocal onset');
});
test('disabled light mode and zero glow strength emit no accent while keeping the vocal graph stable',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 let initial=0;
 for(let i=0;i<200;i++){
  const now=i*.04;g.context.currentTime=now;
  const emission={mode:i<100?0:2,strength:i<100?1:0,speed:1,seed:0};
  e.update([{sp,weight:1,visual:{time:now,motion:0,emission}}],.5);
  const v=[...e.voices.values()][0];
  if(i===0)initial=g.nodes.length;
  assert.equal(g.nodes.length,initial,'no new sound sources at light transitions');
  assert.equal(v.blinkEvents,0);
  assert.ok(v.lightVoices.every(p=>p.amplitude===0&&p.gain.gain.value===0));
 }
});
test('surface displacement amplitude controls only bounded high-frequency vibrato, never alarm glide',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 sp.genome.surfaceDNA={depth:.85,coupling:1,phase:1,drift:.5};
 const at=(motion,surfaceTime)=>{g.context.currentTime+=.10;e.update([{sp,weight:1,visual:{motion,surfaceTime,time:surfaceTime,emission:{mode:0}}}],.5);return [...e.voices.values()][0]};
 const off=at(0,1.90),voiceIndex=sp.seed%off.voiceCount,quiet=off.layers[voiceIndex].vibratoDepth;
 assert.equal(off.surfaceAmplitude,0);
 const moving=at(1.8,1.90),strong=moving.layers[voiceIndex].vibratoDepth;
 assert.ok(moving.surfaceAmplitude>.8);
 assert.ok(strong>quiet+.08,'surface amplitude should directly deepen one voice vibrato');
 assert.ok(strong<=.17);
 const shallow=at(1.8,15.6);
 assert.ok(shallow.surfaceAmplitude>=0&&shallow.surfaceAmplitude<=1);
 assert.ok(shallow.layers.every(layer=>layer.vibratoDepth<=.17));
});
test('actual rendered skin displacement directly determines the pitch-vibrato depth, not a separate oscillator amplitude',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(571938);
 sp.genome.surfaceDNA={depth:.51,coupling:.76,phase:.3,lag:.48,drift:.78};
 const visual={time:1.2,surfaceTime:1.2,motion:.4,surfaceMotion:.4,emission:{mode:0}};
 g.context.currentTime=1.2;e.update([{sp,weight:1,visual}],.5);
 const v=[...e.voices.values()][0],skin=v.skin;
 const probes=[{y:.33,boundary:.13,ridge:.93},{y:-.31,boundary:-.2,ridge:.11}];
 v.surfaceProbes=probes;
 const expected=time=>{
  const pressure=(.4-.2)/4,motion=.4;
  let total=0;
  for(const p of probes){
   const amount=skin.depth*skin.coupling*(p.ridge-.35)*
    (.012+.025*Math.sin(time*(.22+.16*skin.drift)+skin.phase-skin.lag*(p.y*2+p.boundary*3)))*
    motion*(1+.25*pressure);
   total+=amount*amount;
  }
  return Math.sqrt(total/probes.length);
 };
 const vibratoVoice=sp.seed%v.voiceCount;
 const samples=[];
 for(const time of [0,3,6,9,12]){
  g.context.currentTime+=.10;visual.surfaceTime=time;
  e.update([{sp,weight:1,visual}],.5);
  const rms=expected(time);
  assert.ok(Math.abs(v.surfaceDisplacement-rms)<1e-12,'audio must reproduce the shader displacement magnitude');
  const factor=Math.min(1,rms/.006);
  assert.ok(Math.abs(v.surfaceAmplitude-factor)<1e-12);
  for(const [i,layer] of v.layers.entries()){
   assert.ok(Math.abs(layer.vibratoDepth-factor*(i===vibratoVoice?.17:.045))<1e-12);
  }
  samples.push(rms);
 }
 assert.ok(Math.max(...samples)-Math.min(...samples)>.0005,'vibrato strength tracks the changing surface amplitude');
});
test('surface intensity and motion amplitude scale vibrato linearly and fall to zero when surface stops',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 sp.genome.surfaceDNA={depth:.65,coupling:.7,phase:1,lag:.5,drift:.4};
 const amplitude=surfaceMotion=>{
  g.context.currentTime+=.11;
  e.update([{sp,weight:1,visual:{time:2,surfaceTime:2,motion:.5,surfaceMotion,emission:{mode:0}}}],.5);
  const v=[...e.voices.values()][0];
  return{rms:v.surfaceDisplacement,norm:v.surfaceAmplitude,
   note:v.layers[0].noteMidi,depth:v.layers[sp.seed%v.voiceCount].vibratoDepth,
   slow:v.skinVoices[0].amplitude};
 };
 const low=amplitude(.20),high=amplitude(.40),off=amplitude(0);
 assert.ok(low.rms>0);
 assert.ok(Math.abs(high.rms/low.rms-2)<1e-10,'GPU uMotion must be a linear physical amplitude factor');
 assert.ok(Math.abs(high.depth/low.depth-2)<1e-10,'the mapped vibrato follows amplitude directly before the ceiling');
 assert.equal(off.rms,0);assert.equal(off.norm,0);assert.equal(off.depth,0);
 assert.equal(off.note,high.note,'melodic contour remains unchanged by surface movement');
 assert.equal(off.slow,high.slow,'existing slow flowing voice is not retimed');
});
test('actual shell probes carry pigment-boundary and relative-position phase from the vertex shader',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 sp.genome.surfaceDNA={depth:.8,coupling:1,lag:.6,drift:.5,phase:1};
 sp.shell={data:new Float32Array([
  .1,-.25,.2,0,0,1,1,0,0,
  -.45,.15,.12,0,0,1,1,0,0,
  .32,.72,.11,0,0,1,1,0,0
 ])};
 sp.palette={design:{grammar:1,phase:.4,areas:[.38]},chromaticFrame:{
  origin:[0,0,0],axis:[0,1,0],side:[1,0,0],depth:[0,0,-1],extent:[1,1,1]}};
 g.context.currentTime=.2;e.update([{sp,weight:1,visual:{surfaceTime:.2,motion:.6,emission:{mode:0}}}],.5);
 const v=[...e.voices.values()][0],p=v.surfaceProbes;
 assert.equal(p.length,3);
 assert.ok(p.every(x=>Number.isFinite(x.y)&&Number.isFinite(x.boundary)&&x.ridge>=0&&x.ridge<=1));
 for(let i=0;i<3;i++){
  const offset=i*9,x=sp.shell.data[offset],y=sp.shell.data[offset+1];
  const boundary=x*.72+y*.46+Math.sin(y*3.1+.4)*.10-(.38-.32)+.27;
  assert.ok(Math.abs(p[i].boundary-boundary)<1e-6);
  assert.ok(Math.abs(p[i].ridge-Math.exp(-boundary*boundary*100))<1e-6);
 }
});
test('the on-screen version, document title and GPU status use one release',()=>{
 const title=html.match(/<title>MORPHOSPACE (v\d+\.\d+\.\d+)/)?.[1];
 const visible=html.match(/class="version-label">(v\d+\.\d+\.\d+)<\/span>/)?.[1];
 const atlas=html.match(/QUALIA \/ CAPTURE & SHARE \/ (v\d+\.\d+\.\d+)/)?.[1];
 const note=html.match(/MORPHOSPACE (v\d+\.\d+\.\d+) — QUALIA ECOLOGY/)?.[1];
 const status=html.match(/textContent='(v\d+\.\d+\.\d+) \/ '/)?.[1];
 assert.ok(title&&visible&&atlas&&note&&status);
 assert.equal(visible,title);assert.equal(atlas,title);assert.equal(note,title);assert.equal(status,title);
});
test('inherited vocal melodies use multiple scales and remain distinct between organisms',()=>{
 const signatures=new Set(),modes=new Set();
 for(const seed of [1,2,3,4,5,6,7,8,9,42,731029,571938,856123,9473,1008,77357,192873,76241]){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed),notes=[];
  let last='';
  for(let i=0;i<120;i++){
   g.context.currentTime=i*.19;e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
   const v=[...e.voices.values()][0],lead=v.layers[0];
   modes.add(lead.mode);
   assert.ok(lead.noteMidi>=62&&lead.noteMidi<=69);
   assert.ok(v.layers[1].noteMidi>=67&&v.layers[1].noteMidi<=74);
   assert.ok(v.layers[2].noteMidi>=72&&v.layers[2].noteMidi<=77);
   const key=lead.phraseNumber+':'+lead.noteStep;
   if(key!==last){notes.push(lead.noteMidi.toFixed(2));last=key;}
  }
  signatures.add(notes.slice(0,12).join(','));
  e.silence();
 }
 assert.ok(modes.size>=6);
 assert.ok(signatures.size>=16);
});
test('vocal scale and motif genes influence the pitches heard',()=>{
 function notes(changes){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(731029);
  Object.assign(sp.genome.soundDNA,changes);
  const pitches=[];
  for(let i=0;i<100;i++){
   g.context.currentTime=i*.17;e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
   pitches.push([...e.voices.values()][0].layers[0].noteMidi.toFixed(2));
  }
  return pitches.join(',');
 }
 const original=notes({});
 assert.notEqual(original,notes({mode:8}));
 assert.notEqual(original,notes({motif:197}));
});
test('all inherited modes remain available, but Balkan clusters are replaced by a consonant choral family',()=>{
 const graph1=graph(),engine=ctx.createBioticAudioEngine(graph1.context);
 const names=new Set(Array.from({length:18},(_,i)=>engine.harmonyForMode(i).key));
 assert.ok(['japanese','pentatonic','arabic','choral','microtonal','modal'].every(name=>names.has(name)));
 assert.equal(names.has('bulgarian'),false,'no former dissonant Balkan harmony');
 assert.equal(names.size,6,'the six mode families retain their diversity');
 assert.equal(engine.harmonyForMode(0).key,'pentatonic');
 assert.equal(engine.harmonyForMode(9).key,'japanese');
 assert.equal(engine.harmonyForMode(16).key,'arabic');
 assert.equal(engine.harmonyForMode(7).key,'choral');
 assert.equal(engine.harmonyForMode(15).key,'choral');
 assert.deepEqual(plain(engine.harmonyForMode(7).stable),[7,12]);
 assert.deepEqual(plain(engine.harmonyForMode(7).tension),[4,9]);
});
test('vocal response voices inherit scale intervals, with bounded tension and release',()=>{
 const signatures=new Set(),heard=new Set();
 for(let seed=1;seed<=36;seed++){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed);
  const chord=[];
  for(let t=0;t<175;t++){
   g.context.currentTime=t*.18;
   e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
   const v=[...e.voices.values()][0],pair=v.layers.slice(1);
   for(const [i,layer] of pair.entries()){
    assert.ok(Number.isFinite(layer.noteMidi));
    assert.ok(layer.noteMidi>=[67,72][i]&&layer.noteMidi<=[74,77][i]);
    assert.ok(Number.isFinite(layer.harmonicInterval));
    if(layer.harmonyTension)heard.add(v.harmony.key);
   }
   if(t%11===0)chord.push(pair.map(x=>x.noteMidi.toFixed(2)).join(':'));
  }
  signatures.add(chord.join('|'));
 }
 assert.ok(signatures.size>=30,'individual harmonic voicings should not converge');
 assert.ok(heard.size>=4,'tensions must occur across several tonal families');
});
test('reassigned chorale modes avoid seconds, sevenths and tritone collisions across three voices',()=>{
 const allowed=[0,3,4,5,7,8,9],acceptable=d=>{
  const semis=((d%12)+12)%12;
  return allowed.some(p=>Math.abs(semis-p)<.12);
 };
 const intervalSignatures=new Set(),modes=new Set(),total=0;
 let chords=0;
 for(const mode of [7,15]){
  for(const seed of [1,3,5,7,9,11,13,15,17,19,21,42,82,731029,571938,91275]){
   const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed);
   // Synthetic specimens use a fixed fallback hue offset of +7 modes.
   sp.genome.soundDNA.mode=(mode-7+18)%18;
   for(let i=0;i<120;i++){
    g.context.currentTime=i*.137;
    e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
    const v=[...e.voices.values()][0];
    assert.equal(v.harmony.key,'choral');
    assert.equal(v.profile.mode,mode);
    const [lead,alto,soprano]=v.layers.map(x=>x.noteMidi);
    assert.ok(acceptable(alto-lead),'middle response must be consonant to the melody');
    assert.ok(acceptable(soprano-lead),'upper response must be consonant to the melody');
    assert.ok(soprano>=alto-.001,'choral voices must not cross');
    assert.ok(acceptable(soprano-alto),'upper voices must never clash a semitone, whole tone, or tritone apart');
    if(i%3===0)intervalSignatures.add([mode,(alto-lead).toFixed(2),(soprano-alto).toFixed(2)].join(':'));
    chords++;
   }
   modes.add(mode);
  }
 }
 assert.equal(modes.size,2);
 assert.ok(chords>=2000);
 assert.ok(intervalSignatures.size>=8,'choral voicings still vary by organism and phrase');
});
test('non-choral scale rules keep their existing counterpoint and rhythmic expression',()=>{
 const seeds=[1,2,5,42,73,181,729];
 for(const seed of seeds){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(seed);
  sp.genome.soundDNA.mode=0;
  g.context.currentTime=.5;e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
  const v=[...e.voices.values()][0],mode=v.profile.mode;
  assert.equal(mode,7); // fallback base mode for mode=0 is 7, verify mapping above
  assert.equal(v.harmony.key,'choral');
  assert.ok(v.layers[0].source.starts.length===1);
  assert.ok(v.lightVoices.length===4&&v.skinVoices.length===2);
 }
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 sp.genome.soundDNA.mode=2; // original mode 9: Japanese fourth-based family
 e.update([{sp,weight:1,visual:{motion:0,emission:{mode:0}}}],.5);
 const v=[...e.voices.values()][0];
 assert.equal(v.harmony.key,'japanese');
 assert.deepEqual(plain(v.harmony.stable),[5,12]);
 assert.deepEqual(plain(v.harmony.tension),[7,9]);
});
test('peristaltic slow vowels and finer articulated tissue rhythms share the vocal reverb',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 sp.genome.surfaceDNA={depth:.84,coupling:1,phase:1,drift:.9,scale:9.5,lag:.8,direction:.3};
 const maxima=[0,0],events=[0,0],syllables=[new Set(),new Set()];
 let initial=0;
 for(let i=0;i<640;i++){
  const now=i*.035;g.context.currentTime=now;
  e.update([{sp,weight:1,visual:{time:now,surfaceTime:now,motion:1.6,emission:{mode:0}}}],.5);
  const v=[...e.voices.values()][0];
  if(i===0)initial=g.nodes.length;
  assert.equal(g.nodes.length,initial);
  v.skinVoices.forEach((part,j)=>{
   maxima[j]=Math.max(maxima[j],part.amplitude);
   events[j]=part.events;
   syllables[j].add(part.syllable);
   assert.ok(part.gain.gain.value>=0&&part.gain.gain.value<.16);
   assert.ok(part.source.frequency.value>=285&&part.source.frequency.value<=710);
   assert.ok(part.filters.every(filter=>filter.type==='bandpass'));
  });
 }
 const v=[...e.voices.values()][0],reverb=v.nodes.find(x=>x.type==='convolver');
 assert.ok(v.sum.connections.includes(reverb));
 assert.ok(maxima[0]>.1,'slow peristalsis should create longer shaped sound');
 assert.ok(maxima[1]>.1,'fine wrinkles should trigger faster vocal segments');
 assert.ok(events[1]>events[0]+4,'fine articulated motion should occur more frequently than slow peristalsis');
 assert.ok(syllables[1].size>1,'repeated tissue motions should articulate changing syllables');
 assert.ok(v.skinPulseEvents>10);
});
test('peristalsis disappears when movement is disabled; motion still drives bounded vibrato',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 for(let i=0;i<90;i++){
  const now=i*.06;g.context.currentTime=now;
  e.update([{sp,weight:1,visual:{time:now,surfaceTime:now,motion:0,emission:{mode:0}}}],.5);
  const v=[...e.voices.values()][0];
  assert.ok(v.skinVoices.every(p=>p.amplitude===0&&p.gain.gain.value===0));
 }
 const v=[...e.voices.values()][0];assert.equal(v.skinPulseEvents,0);
});
test('deep reverb and repeats use bounded filtered feedback and share the voice recording path',()=>{
 const g=graph(),engine=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 engine.update([{sp,weight:1}],.6);
 const voice=[...engine.voices.values()][0];
 const reverb=voice.nodes.find(n=>n.type==='convolver');
 assert.ok(reverb&&reverb.buffer,'diffuse impulse reverb must exist');
 const delays=voice.nodes.filter(n=>n.type==='delay');
 assert.equal(delays.length,1);
 assert.ok(delays[0].delayTime.value>=.5&&delays[0].delayTime.value<=.8);
 const feedback=voice.nodes.find(n=>n.type==='gain'&&n.gain.value===.34);
 assert.ok(feedback&&feedback.connections.includes(delays[0]));
 const damping=voice.nodes.find(n=>n.frequency?.value>=1450&&n.frequency?.value<=2150&&n.type==='lowpass');
 assert.ok(damping&&delays[0].connections.includes(damping));
 assert.ok(voice.sum.connections.includes(reverb));
 const count=g.nodes.length;
 for(let i=1;i<30;i++){g.context.currentTime=i*.1;engine.update([{sp,weight:1}],.6)}
 assert.equal(g.nodes.length,count,'no per-note delay or reverb allocation');
 assert.ok(engine.output.connections.some(n=>n.type==='limiter'));
 const recording=engine.recording();assert.equal(recording.track,g.track);
 recording.disconnect();engine.silence();
 assert.ok(voice.sources.every(source=>source.stops.length===1));
});
test('vocal pitches are stable within phrases, without slow alarm-like frequency sweeps',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(731029);let adjacent=0,maxJump=0,previous=null;
 for(let i=0;i<400;i++){
  g.context.currentTime=i*.04;e.update([{sp,weight:1}],.5);
  const v=[...e.voices.values()][0],now={pitch:v.layers[0].source.frequency.value,gain:v.layers[0].gain.gain.value,noteStep:v.layers[0].noteStep};
  assert.ok(now.pitch>=285&&now.pitch<=710);
  const duration=Math.max(5,Math.min(7.5,4.9+v.dna.cycle*.13));
  const phrase=Math.floor((Math.max(0,g.context.currentTime-v.start)+v.dna.phase)/duration);
  if(previous&&previous.phrase===phrase&&previous.noteStep===now.noteStep&&now.gain>.025&&previous.gain>.025){maxJump=Math.max(maxJump,Math.abs(now.pitch-previous.pitch));adjacent++;}
  now.phrase=phrase;
  previous=now;
 }
 assert.ok(adjacent>25);assert.ok(maxJump<12,'active vocal phrase must not sweep like an alarm');
});
test('sound DNA and bounded recursive pulse families are deterministic and vary by individual and cycle',()=>{
 const r=run(`(()=>{let different=false,active=false;for(let seed=1;seed<=100;seed++){const d=soundFounderDNA(seed),a=soundPulseTree(d,seed,0),b=soundPulseTree(d,seed,1);if(JSON.stringify(a)!==JSON.stringify(soundPulseTree(d,seed,0)))throw Error('unstable');if(a.length>15||a.some(e=>e.depth>3||e.duration<=0||e.start+e.duration>d.cycle))throw Error('unbounded recursion');different||=JSON.stringify(a)!==JSON.stringify(b);for(let t=0;t<d.cycle;t+=.017){const p=soundPulseValue(a,t);if(!Number.isFinite(p.breath)||p.breath<0||p.breath>1.8||p.grains<0||p.grains>1.5)throw Error('invalid envelope');active||=p.breath>.1;}}return{different,active};})()`);
 assert.deepEqual(plain(r),{different:true,active:true});
});
test('audio chromosomes inherit both parental blocks across generations without mutating parents or exceeding bounds',()=>{
 const r=run(`(()=>{let a=makeFounderGenome(731029,0,4),b=makeFounderGenome(571938,1,3),mutations=0;const parents=new Set();for(let generation=0;generation<40;generation++){const before=JSON.stringify([a,b]),child=crossoverGenome(a,b,119731+generation*97,3,.75);if(before!==JSON.stringify([a,b]))throw Error('changed parent');for(const [k,[lo,hi]]of Object.entries(SOUND_LIMITS)){const v=child.genome.soundDNA[k];if(!Number.isFinite(v)||v<lo-.00001||v>hi+.00001)throw Error('out of bounds '+k);}for(const k of ['timbre','rhythm','response'])parents.add(child.inherited['sound_'+k]);mutations+=child.mutationLog.filter(x=>x.field.startsWith('soundDNA.')).length;b=a;a=child.genome;}return{parents:[...parents].sort(),mutations};})()`);
 assert.deepEqual(plain(r.parents),['A','B']);assert.ok(r.mutations>20);
});
test('saved audio DNA round trips through share links, with deterministic upgrades for old genomes',()=>{
 const r=run(`(()=>{const g=makeFounderGenome(731029,0,4);g.soundDNA=soundFounderDNA(g.seed);const p={version:1,record:{id:'audio',name:'音響標本',seed:g.seed,style:g.style,genome:g,generation:1,parents:[]}};const q=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(p));const same=JSON.stringify(q.record.genome.soundDNA)===JSON.stringify(g.soundDNA);delete p.record.genome.soundDNA;const legacy=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(p));return{same,legacy:JSON.stringify(normalizedSoundDNA(legacy.record.genome.soundDNA,g.seed))===JSON.stringify(soundFounderDNA(g.seed))};})()`);
 assert.deepEqual(plain(r),{same:true,legacy:true});
});
test('persistent breath-led voices crossfade without reallocating the incoming organism',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),a=specimen(731029),b=specimen(571938);
 e.update([{sp:a,weight:1}],.45);const first=[...e.voices.values()][0];
 for(let i=1;i<=20;i++){g.context.currentTime=i*.1;e.update([{sp:a,weight:1-i/20},{sp:b,weight:i/20}],.45);assert.ok(e.voices.size<=2)}
 const incoming=[...e.voices.values()].find(v=>v.key!==first.key);assert.ok(incoming);
 e.update([{sp:b,weight:1}],.45);assert.equal([...e.voices.values()][0],incoming);assert.ok(first.oscillators.every(o=>o.stops.length===1));
 assert.ok(incoming.oscillators.every(o=>o.starts.length===1));assert.equal(e.output.gain.value,.45*1.30);
});
test('musical motifs repeat, transform, rest and stay within a bounded pitch range',()=>{
 const r=run(`(()=>{const sp={seed:856123,genome:makeFounderGenome(856123,0,1),palette:{raw:[[.8,.1,.3],[.1,.7,.6]]}},p=soundMusicalProfile(sp),again=soundMusicalProfile(sp);if(JSON.stringify(p)!==JSON.stringify(again))throw Error('unstable motif');const pitches=new Set();let rests=0,changed=0;for(let t=0;t<p.beats;t+=.05){const a=soundMelodyAt(p,t),repeat=soundMelodyAt(p,t+p.beats),variant=soundMelodyAt(p,t+p.beats*2),returning=soundMelodyAt(p,t+p.beats*8);if(Math.abs(a.frequency-repeat.frequency)>.0001||Math.abs(a.frequency-returning.frequency)>.0001)throw Error('lost motif');if(a.frequency<45||a.frequency>3200||a.envelope<0||a.envelope>1)throw Error('out of range');if(a.envelope>.1)pitches.add(a.frequency.toFixed(2));if(!a.envelope)rests++;if(a.frequency!==variant.frequency)changed++;}return{notes:pitches.size,rests,changed,count:p.events.length};})()`);
 assert.ok(r.notes>=5);assert.ok(r.rests>0);assert.ok(r.changed>0);assert.ok(r.count>=12&&r.count<=24);
});
test('shape and pigment change the musical identity; legacy music genes upgrade deterministically',()=>{
 const r=run(`(()=>{const seed=731029,g=makeFounderGenome(seed,0,1),a={seed,genome:g,palette:{raw:[[1,.1,.1]]}},b={seed,genome:{...g,bulge:1.6,elong:2},palette:{raw:[[.1,.1,1]]}},p=soundMusicalProfile(a),q=soundMusicalProfile(b),old={pitch:.4,recursion:2};return{different:p.key!==q.key,root:p.root!==q.root,mode:p.mode!==q.mode,legacy:JSON.stringify(normalizedSoundDNA(old,seed))===JSON.stringify(normalizedSoundDNA(old,seed)),scaleCount:SOUND_SCALES.length};})()`);
 assert.deepEqual(plain(r),{different:true,root:true,mode:true,legacy:true,scaleCount:18});
});
test('body pressure and visible blink alter formant resonances without growing audio graph',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(856123),formants=new Set(),pitches=new Set();
 for(let i=0;i<160;i++){g.context.currentTime=i*.08;sp.biome.nodes.forEach(n=>{n.pressure=.5*Math.sin(i*.08);n.velocity=.3*Math.cos(i*.08)});e.update([{sp,weight:1,visual:{time:i*.08,motion:1,emission:{mode:3,speed:1,strength:1}}}],1);const v=[...e.voices.values()][0];formants.add(Math.round(v.layers[0].filters[0].frequency.value));pitches.add(Math.round(v.layers[0].source.frequency.value));if(i===0)sp.initialNodes=g.nodes.length;assert.equal(g.nodes.length,sp.initialNodes)}
 assert.ok(formants.size>12);assert.ok(pitches.size>=3);e.silence();
});
test('sound DNA is preserved through multiple generations and share encoding including all musical fields',()=>{
 const r=run(`(()=>{let a=makeFounderGenome(1,0,0),b=makeFounderGenome(42,1,1);for(let i=0;i<20;i++){const c=crossoverGenome(a,b,700+i,3,.75);const payload={version:1,record:{id:'music',name:'音響標本',seed:c.genome.seed,style:c.genome.style,genome:c.genome,generation:i,parents:[]}};const decoded=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(payload));if(JSON.stringify(decoded.record.genome.soundDNA)!==JSON.stringify(c.genome.soundDNA))throw Error('lost music');for(const k of SOUND_INTEGERS)if(!Number.isInteger(c.genome.soundDNA[k]))throw Error('fractional '+k);a=b;b=c.genome;}return true;})()`);
 assert.equal(r,true);
});
test('evenly distributed rhythms have the requested pulse count and balanced circular gaps',()=>{
 for(let steps=5;steps<=16;steps++)for(let pulses=1;pulses<steps;pulses++)for(const rotation of [0,3]){
  const hits=[];for(let i=0;i<steps;i++)if(ctx.soundEuclideanOn(i,pulses,steps,rotation))hits.push(i);
  assert.equal(hits.length,pulses);const gaps=hits.map((v,i)=>(hits[(i+1)%hits.length]-v+steps)%steps||steps);assert.ok(Math.max(...gaps)-Math.min(...gaps)<=1);
 }
});
test('arpeggios follow organism motion contours rather than fixed up/down note sequences',()=>{
 const p=ctx.soundMusicalProfile(specimen(856123));p.swing=0;
 const notes=Array.from({length:160},(_,i)=>ctx.soundPerformanceAt(p,i*.21,0,1));
 assert.ok(notes.every(n=>Number.isFinite(n.frequency)&&n.frequency>=45&&n.frequency<=3200));
 assert.ok(new Set(notes.map(n=>Math.round(n.frequency))).size>2,'pulse waveform should produce different chord pitches');
 const alternate=ctx.soundMusicalProfile(specimen(731029));
 const other=Array.from({length:160},(_,i)=>ctx.soundPerformanceAt(alternate,i*.21,0,1).frequency.toFixed(2));
 assert.notDeepEqual(notes.map(n=>n.frequency.toFixed(2)),other,'organism motion should alter the melodic contour');
});
test('all eight performance styles produce distinct bounded two-part trajectories',()=>{
 const p=ctx.soundMusicalProfile(specimen(731029)),signatures=new Set();
 for(let expression=0;expression<8;expression++){
  const trajectory=[];for(let i=0;i<400;i++)for(let part=0;part<2;part++){
   const n=ctx.soundPerformanceAt(p,i*.047,part,expression);assert.ok(Number.isFinite(n.frequency)&&n.frequency>=45&&n.frequency<=3200);assert.ok(n.envelope>=0&&n.envelope<=1);trajectory.push([Math.round(n.frequency),Math.round(n.envelope*20)]);
  }
  signatures.add(JSON.stringify(trajectory));
 }
 assert.equal(signatures.size,8);
});
test('all legacy performance genes feed vocal synthesis, not an instrument oscillator',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(571938);sp.genome.soundDNA.expression=7;e.update([{sp,weight:1}],1);
 const v=[...e.voices.values()][0];assert.ok(v.layers.every(layer=>layer.source.type==='sawtooth'));assert.equal(v.piano,undefined);
});
test('voice families, expression genes and groove types cover a diverse founder population',()=>{
 const r=run(`(()=>{const voices=new Set(),expressions=new Set(),grooves=new Set();for(let seed=1;seed<=256;seed++){const d=soundFounderDNA(seed);voices.add(d.voiceKind);expressions.add(d.expression);grooves.add(d.phraseKind);}return{voices:voices.size,expressions:expressions.size,grooves:grooves.size};})()`);
 assert.deepEqual(plain(r),{voices:6,expressions:9,grooves:5});
});
test('slider keeps its 50 percent baseline and bounded 0 to 100 percent adjustment',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 for(const volume of [0,.1,.25,.5,.75,1]){
  e.update([{sp,weight:1}],volume);
  assert.ok(Math.abs(e.output.gain.value-volume*1.30)<1e-10);
 }
 e.update([{sp,weight:1}],.5);assert.equal(e.output.gain.value,.65);
 e.update([{sp,weight:1}],1);assert.equal(e.output.gain.value,1.30);
 e.update([{sp,weight:1}],0);assert.equal(e.output.gain.value,0);
 e.update([{sp,weight:1}],5);assert.equal(e.output.gain.value,1.30);
 e.update([{sp,weight:1}],-5);assert.equal(e.output.gain.value,0);
});
test('peak guard and soft ceiling protect speakers and recordings without attenuating quiet voices',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 const limiter=g.nodes.find(n=>n.type==='limiter'),safety=g.nodes.find(n=>n.type==='safety');
 const boost=limiter?.connections[0],peakGuard=boost?.connections[0];
 assert.ok(limiter&&safety&&boost&&boost.type==='gain');
 assert.equal(boost.gain.value,1.25,'output is boosted by precisely 25 percent');
 assert.ok(peakGuard&&peakGuard.type==='limiter'&&peakGuard!==limiter,'independent fast peak guard follows boost');
 assert.ok(peakGuard.connections.includes(safety),'peak guard must precede shared safety ceiling');
 assert.equal(peakGuard.threshold.value,-8);
 assert.equal(peakGuard.ratio.value,18);
 assert.equal(peakGuard.attack.value,.002);
 assert.equal(peakGuard.release.value,.17);
 assert.ok(safety.connections.includes(e.waveform));
 assert.ok(e.waveform.connections.includes(e.galleryLow),'waveform must feed the first gallery low-pass');
 assert.ok(e.galleryLow.connections.includes(e.galleryLow2),'gallery low-pass stages must be cascaded');
 assert.ok(e.galleryLow2.connections.includes(e.galleryVolume),'filtered output must pass through gallery volume control');
 assert.ok(e.galleryVolume.connections.includes(e.startupGain),'gallery volume must pass through startup fade');
  assert.ok(e.startupGain.connections.includes(g.context.destination),'startup fade must reach speakers');
 assert.equal(e.galleryVolume.gain.value,1,'viewer volume is unchanged by default');
 assert.equal(e.galleryLow.type,'lowpass');
 assert.equal(e.galleryLow2.type,'lowpass');
 assert.equal(safety.oversample,'4x');
 assert.ok(ArrayBuffer.isView(safety.curve)&&safety.curve.length>=1024);
 let last=-2;
 for(let i=0;i<safety.curve.length;i++){
  const value=safety.curve[i],input=2*i/(safety.curve.length-1)-1;
  assert.ok(Number.isFinite(value));assert.ok(value>=last);assert.ok(Math.abs(value)<.95);last=value;
  if(Math.abs(input)<=.80)assert.ok(Math.abs(value-input)<1e-6,'quiet input must retain unity gain');
 }
 for(const volume of [0,.5,1]){
  e.update([{sp,weight:1}],volume);
  assert.equal(boost.gain.value,1.25,'volume changes must not compound the fixed boost');
 }
 const rec=e.recording();assert.equal(rec.track,g.track);
 const fade=safety.connections.find(n=>n.type==='gain'&&n.connections.some(x=>x.type==='recording'));
 assert.ok(fade,'recording must pass through a separate fade gain');
 assert.ok(e.snowRecordingTap.connections.includes(fade),'marine snow must reach recording through an isolated tap');
 rec.begin();
 assert.equal(fade.gain.value,1,'test AudioParam mock uses immediate fade fallback');
 assert.equal(e.output.connections.length,1);
 rec.disconnect();assert.equal(safety.connections.length,1);
 assert.equal(g.track.stops,1);
});
test('morph source voices fade independently and wavetable updates retain their fundamental',()=>{
 const choir=src.slice(src.indexOf('function renderPureChoir('),src.indexOf('function updatePureChoir('));
 assert.match(choir,/v\.waveVoice=nextIndex/);
 assert.match(choir,/v\.waveVoice!==undefined&&p\.h<=2\?1:p\.h/);
 assert.match(src,/renderPureChoir\(quiet,pureChoir,m\.source,Math\.cos\(angle\)\)/);
 assert.match(src,/renderPureChoir\(quiet,incomingPureChoir,m\.target,Math\.sin\(angle\)\)/);
 assert.match(choir,/sharedVoiceLevel\*clamp\(lightBed\+gate\/\.75/,'light choir stays below its earlier level');
});
test('20 percent blinking voices preserve independent bass and body-driven rhythm',()=>{
 const choir=src.slice(src.indexOf('function renderPureChoir('),src.indexOf('function updatePureChoir('));
 const engine=src.slice(src.indexOf('function createBioticAudioEngine('),src.indexOf('const bioticAudio='));
 assert.match(engine,/const gain=\.20\*envelope\*\(rapidLight/);
 assert.match(engine,/consonantAir\+=\.20\*envelope\*art\.air/);
 assert.match(choir,/v\.out\.gain\.setTargetAtTime\(sharedVoiceLevel\*clamp\(lightBed\+gate\/\.75/);
 assert.match(choir,/const bassWarmth=ctx\.createBiquadFilter\(\),bassPresence=ctx\.createGain\(\)/);
 assert.match(choir,/state\.pulse\.out\.connect\(bassWarmth\);bassWarmth\.connect\(bassPresence\);bassPresence\.connect\(state\.master\)/);
 assert.match(choir,/bassWarmth\.frequency\.value=330/);
 assert.match(choir,/bassPresence\.gain\.value=0/);
 assert.match(choir,/sharedVoiceLevel\*clamp\(pulseEnvelope\*state\.grooveAccent,0,1\)/);
 assert.match(choir,/state\.rhythm\.dry\.gain\.setTargetAtTime\(\(1\.00-strain\*\.18\)\*highpassTrim/);
 assert.match(choir,/tune\(state\.body,bodyPitch/,'body voice follows its existing bending law');
 assert.match(src,/renderPureChoir\(quiet,incomingPureChoir,m\.target,Math\.sin\(angle\)\)/);
});
test('metallic light calls soften above 3 kHz without filtering bass or body',()=>{
 const choir=src.slice(src.indexOf('function renderPureChoir('),src.indexOf('function updatePureChoir('));
 assert.match(choir,/for\(const v of state\.lights\)\{\s*const tamer=ctx\.createBiquadFilter\(\)/);
 assert.match(choir,/tamer\.type='highshelf';tamer\.frequency\.value=3000;tamer\.gain\.value=-3\.5/);
 assert.match(choir,/v\.out\.disconnect\(\);v\.out\.connect\(tamer\);tamer\.connect\(rhythmInput\)/);
 assert.match(choir,/state\.pulse\.out\.connect\(bassWarmth\);bassWarmth\.connect\(bassPresence\)/);
  assert.match(choir,/sharedVoiceLevel\*clamp\(lightBed\+gate\/\.75,0,1\),ctx\.currentTime,\.09/);
 assert.match(choir,/state\.body\.out\.gain\.setTargetAtTime\(sharedVoiceLevel\*clamp\(bodyLevel\/\.48,0,1\)/);
});
test('pulse and luminous syllables follow live crests with independent gains',()=>{
 const choir=src.slice(src.indexOf('function renderPureChoir('),src.indexOf('function updatePureChoir('));
 assert.match(choir,/priorSlope>0&&slopeNow<=0&&value>\.045&&t-last>\.17/);
 assert.match(choir,/light>\.38&&previous<=\.38/);
 assert.doesNotMatch(choir,/t-state\.grooveTime>\.65/);
 assert.doesNotMatch(choir,/t-state\.lightLastHit\[i\]>\.92/);
 assert.match(choir,/sharedVoiceLevel\*clamp\(pulseEnvelope\*state\.grooveAccent,0,1\)/);
 assert.match(choir,/v\.out\.gain\.setTargetAtTime\(sharedVoiceLevel\*clamp\(lightBed\+gate\/\.75/);
 assert.match(choir,/sharedVoiceLevel\*clamp\(bodyLevel\/\.48,0,1\)/);
});
test('closed audio-contour smoothing rounds impulses and blink envelope boundaries',()=>{
 const fn=src.slice(src.indexOf('function smoothCyclicAudioContour('),src.indexOf('function organismMotionPickups('));
 const sandbox=vm.createContext({Float64Array,Float32Array,Math});
 vm.runInContext(fn,sandbox);
 const impulse=Array.from({length:64},(_,j)=>j===0?1:0),curve=sandbox.smoothCyclicAudioContour(impulse,3);
 assert.equal(curve.length,64);
 assert.ok(curve[0]<.30&&curve[0]>.05,'pointed impulse becomes a rounded peak');
 assert.ok(curve[1]>curve[2]&&curve[2]>curve[3]&&curve[3]>0,'rounded peak has smooth shoulders');
 assert.equal(curve[1],curve[63],'the circular contour closes without a seam');
 assert.ok(Math.abs(curve.reduce((a,b)=>a+b,0)-1)<1e-12,'contour smoothing preserves average');
 const envelope=x=>sandbox.roundedLightEnvelope(x,.4);
 for(const x of [-.01,0,.001,.04,.12,.25,.39,.4,.5])assert.ok(envelope(x)>=0&&envelope(x)<=1);
 assert.equal(envelope(0),0);assert.equal(envelope(.4),0);
 assert.ok(envelope(.001)<envelope(.04)*.01,'light attack should have no sudden slope');
 assert.ok(envelope(.399)<envelope(.35)*.01,'light release should have no sudden slope');
});
test('rounded luminous harmonic spectra do not change skin or body sources',()=>{
 const g=graph(),tables=[];
 g.context.createPeriodicWave=(real,imag)=>{const w={real,imag};tables.push(w);return w;};
 const previous=g.context.createOscillator;
 g.context.createOscillator=()=>{const osc=previous();osc.setPeriodicWave=wave=>{osc.wave=wave;osc.type='custom';};return osc;};
 const e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
 e.update([{sp,weight:1}],.5);
 const v=[...e.voices.values()][0];
 assert.equal(tables.length,1,'all light emitters share one smoothed wavetable');
 assert.ok(v.lightVoices.every(p=>p.source.type==='custom'&&p.source.wave===tables[0]));
 assert.ok(v.skinVoices.every(p=>p.source.type==='sawtooth'&&!p.source.wave));
 assert.ok(v.layers.every(p=>p.source.type==='sawtooth'&&!p.source.wave));
 const partials=tables[0].imag;
 assert.ok(Math.abs(partials[8]/partials[1])<.04,'sharp high harmonics are suppressed');
 assert.ok(Math.abs(partials[2]/partials[1])>.2,'rounded timbre still has metallic upper harmonics');
 e.silence();
});
function controller(resume,savedSound=null,active=true,savedVolume=null){
 const g=graph(),elements={},intervals=new Map(),timeouts=[],listeners={},writes={};let timer=0;
 g.context.resume=resume||(()=>{g.context.state='running';return Promise.resolve()});g.context.suspend=()=>{g.context.state='suspended';return Promise.resolve()};
 const f={console,Math,seedRng:ctx.seedRng,normalizedSoundDNA:ctx.normalizedSoundDNA,soundPulseTree:ctx.soundPulseTree,soundPulseValue:ctx.soundPulseValue,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),createBioticAudioEngine:ctx.createBioticAudioEngine,soundMusicalProfile:ctx.soundMusicalProfile,normalizedSurfaceDNA:ctx.normalizedSurfaceDNA,normalizedMotionDNA:ctx.normalizedMotionDNA,viewerEmissionValues:()=>({strength:1,speed:.8,seed:0,mode:2}),window:{AudioContext:function(){return g.context}},spec:specimen(731029),selected:0,animating:true,viewer:{morph:null},nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,videoResult:null,document:{hidden:false,addEventListener:(name,fn)=>listeners[name]=fn},navigator:{userActivation:{isActive:active}},localStorage:{getItem:key=>key==='morphospace-sound-enabled'?savedSound:key==='morphospace-sound-volume-v2'?savedVolume:key==='morphospace-sound-volume'?legacyVolume:null,setItem:(key,value)=>writes[key]=value},$:id=>elements[id]||(elements[id]={value:'50',checked:id==='viewerSound',textContent:'',disabled:false,open:false,classList:{contains:()=>true},setAttribute(k,v){this[k]=v}}),setInterval:fn=>{intervals.set(++timer,fn);return timer},clearInterval:id=>intervals.delete(id),setTimeout:fn=>{timeouts.push(fn);return timeouts.length},clearTimeout(){}};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const bioticAudio='),src.indexOf('function videoStatus(')),f);f.audio=vm.runInContext('bioticAudio',f);return{f,g,elements,intervals,timeouts,listeners,writes};
}
test('iOS AudioSession playback is requested when default-on sound starts with the specimen',async()=>{
 const session={type:'ambient'};let observed='';
 const a=controller(()=>{observed=session.type;return Promise.resolve()});
 a.f.navigator.audioSession=session;
 assert.equal(a.f.$('viewerSound').checked,true);
 assert.equal(a.f.audio.engine,null);
 await a.f.startBioticAudio();
 assert.equal(session.type,'playback');
 assert.equal(observed,'playback');
 assert.equal(a.f.bioticAudioRunning(),true,a.f.$('viewerSoundStatus').textContent);
 const b=controller();b.f.$('viewerSound').checked=true;
 await b.f.startBioticAudio();
 assert.equal(b.f.bioticAudioRunning(),true);
});
test('volume slider defaults to 50, resets legacy maximum safely and persists the rebased value',()=>{
 assert.match(html,/id="viewerSoundVolume"[^>]*value="50"/);
 const fresh=controller();assert.equal(fresh.f.$('viewerSoundVolume').value,'50');
 const old=controller(undefined,null,true,null,'100');assert.equal(old.f.$('viewerSoundVolume').value,'50');
 const saved=controller(undefined,null,true,'73','100');assert.equal(saved.f.$('viewerSoundVolume').value,'73');
 saved.f.$('viewerSoundVolume').value='84';saved.f.$('viewerSoundVolume').oninput();
 assert.equal(saved.writes['morphospace-sound-volume-v2'],'84');
 assert.equal(saved.writes['morphospace-sound-volume'],undefined);
});
test('audio keeps playing when hidden, stops on close, and preserves speaker output after recording',async()=>{
 const {f,g,intervals,listeners}=controller();assert.equal(f.audio.engine,null);assert.equal(intervals.size,0);
 f.$('viewerSound').checked=true;
 await f.startBioticAudio();assert.equal(f.bioticAudioRunning(),true);assert.equal(intervals.size,1);
 const job={},stream={tracks:[],addTrack(track){this.tracks.push(track)}};f.attachBioticRecording(job,stream);assert.equal(stream.tracks[0],g.track);f.detachBioticRecording(job);assert.equal(job.audio,null);assert.equal(f.audio.engine.output.connections.length,1);
 f.document.hidden=true;listeners.visibilitychange();assert.equal(f.audio.enabled,true);assert.equal(intervals.size,1);
 f.document.hidden=false;listeners.visibilitychange();f.selected=-1;f.tickBioticAudio();assert.equal(f.audio.enabled,false);assert.equal(intervals.size,0);
});
test('late resume and rejected audio permission never restart a stopped sound engine',async()=>{
 let release;const a=controller(()=>new Promise(resolve=>release=resolve));a.f.$('viewerSound').checked=true;
 const pending=a.f.startBioticAudio();a.f.stopBioticAudio();release();await pending;assert.equal(a.f.audio.enabled,false);assert.equal(a.intervals.size,0);
 const b=controller(()=>Promise.reject(Error('unavailable')));b.f.$('viewerSound').checked=true;
 await b.f.startBioticAudio();assert.equal(b.f.audio.enabled,false);assert.equal(b.intervals.size,0);assert.match(b.f.$('viewerSoundStatus').textContent,/画面タップで再生/);assert.equal(b.f.$('viewerSound').disabled,false);
});
test('sound defaults on and stays off after manual disable for the current visit',async()=>{
 assert.match(html,/<input id="viewerSound" type="checkbox" checked>活動音/);
 assert.doesNotMatch(html,/<canvas id="audioWaveform"/);
 const a=controller(undefined,'0'),f=a.f;
 assert.equal(f.$('viewerSound').checked,true);
 await f.maybeStartBioticAudio();
 assert.equal(f.bioticAudioRunning(),true);
 f.$('viewerSound').checked=false;f.$('viewerSound').onchange();
 assert.equal(f.audio.enabled,false);
 assert.equal(a.intervals.size,0);
 f.maybeStartBioticAudio();
 assert.equal(f.audio.enabled,false);
 const b=controller(undefined,'0');
 assert.equal(b.f.$('viewerSound').checked,true);
});
test('camera, high-pass trim and particle diffusion have explicit regression guards',()=>{
 assert.match(src,/modelPitch=-0\.703599/,'camera must look down an extra 30 degrees');
 assert.match(src,/const highpassTrim=1-\.42\*clamp\(\(highpassHz-160\)\/700,0,1\)/);
 assert.match(src,/state\.rhythm\.dry\.gain\.setTargetAtTime\(\(1\.00-strain\*\.18\)\*highpassTrim/);
 assert.match(src,/state\.rhythm\.wet\.gain\.setTargetAtTime\(\(\.005\+strain\*\.015\)\*highpassTrim/);
 assert.match(src,/p\+=snowBrownian\(aSnowPos,aSnowInfo\.y,t\)/);
 assert.doesNotMatch(src,/return snowBrownian\(out,data,j,t\)/,'nano-action flow keeps physically advected trajectories');
 assert.doesNotMatch(src,/function drawBioticWaveform\(/,'waveform drawing was removed');
});
test('autoplay is attempted without a gesture and a hidden page retains active audio',async()=>{
 const a=controller(undefined,null,false);
 await a.f.maybeStartBioticAudio();assert.equal(a.f.bioticAudioRunning(),true);
 a.f.document.hidden=true;a.listeners.visibilitychange();
 assert.equal(a.f.audio.enabled,true);
 assert.equal(a.intervals.size,1);
 a.f.document.hidden=false;a.listeners.visibilitychange();
 assert.equal(a.f.bioticAudioRunning(),true);
 a.f.stopBioticAudio();assert.equal(a.f.audio.enabled,false);
});
test('viewer settings are grouped by purpose and sound has one visible control',()=>{
 for(const heading of ['鑑賞・切替','表示情報','活動音','保存'])assert.match(html,new RegExp('<legend>'+heading+'</legend>'));
 for(const id of ['viewerSound','viewerSoundVolume','viewerInterval','viewerSource','viewerRecord'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(html,/<input id="viewerSound" type="checkbox" checked>/);
 assert.match(html,/id="heartbeatEnabled"[^>]*hidden/);
 assert.ok(html.includes("if(typeof maybeStartBioticAudio==='function')maybeStartBioticAudio()"));
});

test('autoplay attempts playback when activation API is unavailable',async()=>{
 const a=controller();delete a.f.navigator.userActivation;
 await a.f.maybeStartBioticAudio();assert.equal(a.f.bioticAudioRunning(),true);
 a.f.stopBioticAudio();assert.equal(a.f.audio.enabled,false);
});


