const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),src=scripts[2];
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});vm.runInContext(scripts[0],ctx);vm.runInContext(src.slice(0,src.indexOf("const canvas=$('glview'),gl=")),ctx);
vm.runInContext(src.slice(src.indexOf('function createBioticAudioEngine('),src.indexOf('const bioticAudio=')),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
function graph(){
 const nodes=[],parameters=[];const parameter=()=>{const p={value:0,events:[],setTargetAtTime(value,time,constant){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&constant>0);this.value=value;this.events.push({value,time,constant})}};parameters.push(p);return p};
 const node=(type)=>{const n={type,connections:[],disconnected:false,connect(other){this.connections.push(other);return other},disconnect(other){if(other)this.connections=this.connections.filter(x=>x!==other);else{this.connections=[];this.disconnected=true}}};nodes.push(n);return n};
 const source=type=>Object.assign(node(type),{frequency:parameter(),starts:[],stops:[],start(...args){assert.ok(args.every(Number.isFinite));this.starts.push(args)},stop(time){this.stops.push(time)}});
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
  assert.equal(v.layers.length,3);assert.equal(v.sources.length,4);
  assert.ok(v.layers.every(layer=>layer.source.type==='triangle'&&layer.filters.length===3));
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
 const damping=voice.nodes.find(n=>n.type==='filter'&&n.frequency.value>=1450&&n.frequency.value<=2150);
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
  const v=[...e.voices.values()][0],now={pitch:v.layers[0].source.frequency.value,gain:v.layers[0].gain.gain.value};
  assert.ok(now.pitch>=285&&now.pitch<=710);
  if(previous&&now.gain>.06&&previous.gain>.06){maxJump=Math.max(maxJump,Math.abs(now.pitch-previous.pitch));adjacent++;}
  previous=now;
 }
 assert.ok(adjacent>80);assert.ok(maxJump<12,'active vocal phrase must not sweep like an alarm');
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
 assert.ok(incoming.oscillators.every(o=>o.starts.length===1));assert.equal(e.output.gain.value,.45*.65);
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
test('ascending, descending and returning arpeggios actually order chord tones differently',()=>{
 const p=ctx.soundMusicalProfile(specimen(856123));p.swing=0;p.arpOctave=0;p.events.forEach(e=>e.degree=0);
 const notes=style=>{p.arpStyle=style;return Array.from({length:6},(_,i)=>ctx.soundPerformanceAt(p,(i+.4)/2,0,1).frequency)};
 const up=notes(0),down=notes(1),returning=notes(2);assert.ok(up[0]<up[1]&&up[1]<up[2]&&up[2]<up[3]);assert.ok(down[0]>down[1]&&down[1]>down[2]&&down[2]>down[3]);assert.ok(returning[2]<returning[3]&&returning[3]>returning[4]&&returning[4]>returning[5]);
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
 const v=[...e.voices.values()][0];assert.ok(v.layers.every(layer=>layer.source.type==='triangle'));assert.equal(v.piano,undefined);
});
test('voice families, expression genes and groove types cover a diverse founder population',()=>{
 const r=run(`(()=>{const voices=new Set(),expressions=new Set(),grooves=new Set();for(let seed=1;seed<=256;seed++){const d=soundFounderDNA(seed);voices.add(d.voiceKind);expressions.add(d.expression);grooves.add(d.phraseKind);}return{voices:voices.size,expressions:expressions.size,grooves:grooves.size};})()`);
 assert.deepEqual(plain(r),{voices:6,expressions:9,grooves:5});
});
test('vocal master volume is bounded and recording follows the limiter',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);let last=-1;
 for(const volume of [0,.1,.45,1]){e.update([{sp,weight:1}],volume);assert.ok(e.output.gain.value>=last&&e.output.gain.value<=1);last=e.output.gain.value;if(!volume)assert.equal(last,0)}
 const rec=e.recording();assert.equal(rec.track,g.track);rec.disconnect();assert.equal(g.track.stops,1);
});
function controller(resume,savedSound=null,active=true){
 const g=graph(),elements={},intervals=new Map(),timeouts=[],listeners={},writes={};let timer=0;
 g.context.resume=resume||(()=>{g.context.state='running';return Promise.resolve()});g.context.suspend=()=>{g.context.state='suspended';return Promise.resolve()};
 const f={console,seedRng:ctx.seedRng,normalizedSoundDNA:ctx.normalizedSoundDNA,soundPulseTree:ctx.soundPulseTree,soundPulseValue:ctx.soundPulseValue,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),createBioticAudioEngine:ctx.createBioticAudioEngine,window:{AudioContext:function(){return g.context}},spec:specimen(731029),selected:0,animating:true,viewer:{morph:null},nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,videoResult:null,document:{hidden:false,addEventListener:(name,fn)=>listeners[name]=fn},navigator:{userActivation:{isActive:active}},localStorage:{getItem:key=>key==='morphospace-sound-enabled'?savedSound:null,setItem:(key,value)=>writes[key]=value},$:id=>elements[id]||(elements[id]={value:'45',checked:id==='viewerSound',textContent:'',disabled:false,open:false,classList:{contains:()=>true},setAttribute(k,v){this[k]=v}}),setInterval:fn=>{intervals.set(++timer,fn);return timer},clearInterval:id=>intervals.delete(id),setTimeout:fn=>{timeouts.push(fn);return timeouts.length},clearTimeout(){}};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const bioticAudio='),src.indexOf('function videoStatus(')),f);f.audio=vm.runInContext('bioticAudio',f);return{f,g,elements,intervals,timeouts,listeners,writes};
}
test('audio starts only on demand, stops on hide/close, and preserves the speaker output after recording',async()=>{
 const {f,g,intervals,listeners}=controller();assert.equal(f.audio.engine,null);assert.equal(intervals.size,0);
 await f.startBioticAudio();assert.equal(f.bioticAudioRunning(),true);assert.equal(intervals.size,1);
 const job={},stream={tracks:[],addTrack(track){this.tracks.push(track)}};f.attachBioticRecording(job,stream);assert.equal(stream.tracks[0],g.track);f.detachBioticRecording(job);assert.equal(job.audio,null);assert.equal(f.audio.engine.output.connections.length,1);
 f.document.hidden=true;listeners.visibilitychange();assert.equal(f.audio.enabled,false);assert.equal(intervals.size,0);assert.equal(f.audio.engine.voices.size,0);
 f.document.hidden=false;await f.startBioticAudio();f.selected=-1;f.tickBioticAudio();assert.equal(f.audio.enabled,false);assert.equal(intervals.size,0);
});
test('late resume and rejected audio permission never restart a stopped sound engine',async()=>{
 let release;const a=controller(()=>new Promise(resolve=>release=resolve));const pending=a.f.startBioticAudio();a.f.stopBioticAudio();release();await pending;assert.equal(a.f.audio.enabled,false);assert.equal(a.intervals.size,0);
 const b=controller(()=>Promise.reject(Error('unavailable')));await b.f.startBioticAudio();assert.equal(b.f.audio.enabled,false);assert.equal(b.intervals.size,0);assert.match(b.f.$('viewerSoundStatus').textContent,/開始できません/);assert.equal(b.f.$('viewerSound').disabled,false);
});
test('sound defaults on at specimen entry, remembers an explicit off and remains cancelable while resuming',async()=>{
 const a=controller();assert.equal(a.f.$('viewerSound').checked,true);await a.f.maybeStartBioticAudio();assert.equal(a.f.bioticAudioRunning(),true);
 a.f.$('viewerSound').checked=false;a.f.$('viewerSound').onchange();assert.equal(a.f.audio.enabled,false);assert.equal(a.writes['morphospace-sound-enabled'],'0');assert.equal(a.f.$('viewerSound').checked,false);
 const b=controller(undefined,'0');b.f.maybeStartBioticAudio();await Promise.resolve();assert.equal(b.f.audio.engine,null);assert.equal(b.f.$('viewerSound').checked,false);
 let release;const c=controller(()=>new Promise(resolve=>release=resolve));c.f.maybeStartBioticAudio();c.f.$('viewerSound').checked=false;c.f.$('viewerSound').onchange();release();await Promise.resolve();assert.equal(c.f.audio.enabled,false);assert.equal(c.intervals.size,0);
});
test('direct links defer blocked autoplay until a real gesture without clearing the on preference',async()=>{
 const a=controller(undefined,null,false);a.f.maybeStartBioticAudio();assert.equal(a.f.audio.engine,null);assert.equal(a.f.$('viewerSound').checked,true);
 a.listeners.click({isTrusted:false});assert.equal(a.f.audio.engine,null);a.f.navigator.userActivation.isActive=true;a.listeners.click({isTrusted:true});await new Promise(setImmediate);assert.equal(a.f.bioticAudioRunning(),true);
 a.f.document.hidden=true;a.listeners.visibilitychange();assert.equal(a.f.audio.enabled,false);assert.equal(a.f.$('viewerSound').checked,true);
 a.f.document.hidden=false;a.listeners.click({isTrusted:true});await new Promise(setImmediate);assert.equal(a.f.bioticAudioRunning(),true);
});
test('viewing controls form five short two-column rows with one accessible sound checkbox',()=>{
 const body=html.match(/<div class="viewer-checks" role="group"[^>]*>([\s\S]*?)<\/div>/)[1],labels=[...body.matchAll(/<label>([\s\S]*?)<\/label>/g)];
 assert.equal(labels.length,10);for(const [,label]of labels){assert.equal((label.match(/<input/g)||[]).length,1);assert.ok([...label.replace(/<[^>]*>/g,'').trim()].length<=5);}
 assert.match(body,/<input id="viewerSound" type="checkbox" checked>/);assert.equal((html.match(/id="auto"/g)||[]).length,1);assert.doesNotMatch(body,/grid-column/);assert.match(html,/if\(typeof maybeStartBioticAudio==='function'\)maybeStartBioticAudio\(\)/);
});
test('browsers without an activation API wait for a gesture instead of leaving resume pending on a direct link',async()=>{
 const a=controller();delete a.f.navigator.userActivation;a.f.maybeStartBioticAudio();assert.equal(a.f.audio.engine,null);await a.f.maybeStartBioticAudio(true);assert.equal(a.f.bioticAudioRunning(),true);
});


