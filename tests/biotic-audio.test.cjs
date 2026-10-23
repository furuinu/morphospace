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
test('contemporary scores reproduce the individual, vary material and use asynchronous bounded clocks',()=>{
 const result=run(`(()=>{const materials=new Set();for(let seed=1;seed<=128;seed++){const sp={seed,genome:{soundDNA:soundFounderDNA(seed)}},p=soundMusicalProfile(sp),q=soundMusicalProfile(sp);if(JSON.stringify(p.score)!==JSON.stringify(q.score))throw Error('unstable');materials.add(p.material.name);if(p.score[0].length===p.score[1].length)throw Error('synchronised');for(let beat=0;beat<100;beat+=.137)for(let part=0;part<2;part++){const n=soundContemporaryAt(p,beat,part);if(!Number.isFinite(n.frequency)||n.frequency<45||n.frequency>3200||n.envelope<0||n.envelope>1||!Number.isFinite(n.attack))throw Error('unbounded');}}return materials.size})()`);
 assert.equal(result,4);
});
test('isolated attacks decay audibly, rests have no hammer noise and the answer waits before entering',()=>{
 const sp=specimen(42),p=ctx.soundMusicalProfile(sp),track=p.score[0],event=track.events[0];
 const early=ctx.soundContemporaryAt(p,p.tempo*.08),late=ctx.soundContemporaryAt(p,Math.min(event.length-.01,p.tempo*.9));
 assert.ok(early.envelope>0);assert.ok(late.envelope<early.envelope);assert.equal(ctx.soundContemporaryAt(p,0,1).attack,0);assert.equal(ctx.soundContemporaryAt(p,0,1).envelope,0);
 const rest=track.events.find(e=>e.rest);assert.ok(rest);const n=ctx.soundContemporaryAt(p,rest.start+.01);assert.equal(n.envelope,0);assert.equal(n.attack,0);
});
test('each voice has deterministic finite room reflections which share correction and cleanup',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);e.update([{sp,weight:1}],.5);const v=[...e.voices.values()][0];
 assert.ok(v.room.buffer);assert.ok(v.sum.connections.includes(v.room));assert.ok(v.roomGain.connections.includes(v.field));assert.ok(v.roomGain.gain.value>=.12&&v.roomGain.gain.value<=.37);
 assert.equal(v.sources.length,5);e.silence();v.sources[0].onended();assert.ok(v.room.disconnected&&v.roomGain.disconnected);
});
test('old drone expressions fall back to a motif and no founder selects a drone',()=>{
 const sp=specimen(42);Object.assign(sp.genome.soundDNA,{expression:8,answerExpression:8,drone:1});const p=ctx.soundMusicalProfile(sp);
 assert.equal(p.expression,0);assert.equal(p.answerExpression,0);assert.equal(p.drone,0);assert.equal(ctx.soundPerformanceAt(p,1,0,8).expression,0);
});
test('waveform is tapped after user volume without changing the recording route',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context);assert.ok(e.output.connections.includes(e.waveform));assert.ok(e.waveform.connections.includes(g.context.destination));assert.equal(e.waveform.fftSize,1024);
 const rec=e.recording();assert.equal(e.output.connections.length,2);rec.disconnect();assert.equal(e.output.connections.length,1);
});
test('small unlabelled waveform draws a baseline and actual samples, flattens on mute and hides outside the viewer',()=>{
 const paths=[],drawing={clearRect(){paths.length=0},beginPath(){paths.push([])},moveTo(x,y){paths.at(-1).push([x,y])},lineTo(x,y){paths.at(-1).push([x,y])},stroke(){}},canvas={width:336,height:88,hidden:true,getContext:()=>drawing};
 let running=true;const c={Float32Array,selected:0,document:{hidden:false},$:id=>id==='audioWaveform'?canvas:{classList:{contains:()=>true}},bioticAudio:{engine:{waveform:{getFloatTimeDomainData(data){for(let i=0;i<data.length;i++)data[i]=Math.sin(i*.1)*.03}}}},bioticAudioRunning:()=>running};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('const bioticWaveform='),src.indexOf('function bioticAudioRunning()')),c);c.drawBioticWaveform(0);
 assert.equal(canvas.hidden,false);assert.deepEqual(paths[0],[[0,44],[336,44]]);assert.ok(paths[1].some(p=>p[1]!==44));
 running=false;c.drawBioticWaveform(40);assert.ok(paths[1].every(p=>p[1]===44));c.selected=-1;c.drawBioticWaveform(80);assert.equal(canvas.hidden,true);
 assert.match(html,/<canvas id="audioWaveform"[^>]*aria-hidden="true"[^>]*><\/canvas>/);assert.match(html,/id="viewerSubtitleText"[^<]*>[\s\S]*?<\/div><canvas id="audioWaveform"/);assert.match(html,/#audioWaveform\{display:block;position:relative;margin-top:6px;[^}]*pointer-events:none/);
});
test('independent founder dimensions cover all voices, expressions, waves and scales without habitat restrictions',()=>{
 const result=run(`(()=>{const voices=new Set(),expressions=new Set(),scales=new Set(),waves=new Set(),pairs=new Set();for(let seed=1;seed<=1024;seed++){const d=soundFounderDNA(seed),sp={seed,genome:{soundDNA:d}},p=soundMusicalProfile(sp);if(JSON.stringify(p)!==JSON.stringify(soundMusicalProfile(sp)))throw Error('unstable');voices.add(d.voiceKind);expressions.add(d.expression);scales.add(p.mode);waves.add(d.waveA);pairs.add(d.voiceKind+':'+d.expression);}return{voices:voices.size,expressions:expressions.size,scales:scales.size,waves:waves.size,pairs:pairs.size}})()`);
 assert.deepEqual(plain(result),{voices:6,expressions:9,scales:18,waves:4,pairs:54});
});
test('fractional world-scale and harmonic intervals remain finite and distinct from twelve-tone pitches',()=>{
 const result=run(`(()=>{let fractional=0;for(const scale of SOUND_SCALES){if(scale[0]!==0||scale.some((x,i)=>x<0||x>=12||(i&&x<=scale[i-1])))throw Error('invalid scale');for(let degree=-20;degree<=20;degree++){const p={scale,root:60,tuning:1,voice:{answerOffset:0}},frequency=soundDegreeFrequency(p,degree);if(!Number.isFinite(frequency)||frequency<45||frequency>3200)throw Error('invalid pitch');}if(scale.some(x=>!Number.isInteger(x)))fractional++;}return fractional})()`);
 assert.equal(result,3);
});
test('waveforms, filter, FM, register and drone tone obey their own genes rather than voice-family presets',()=>{
 const result=run(`(()=>{const sp={seed:42,genome:{soundDNA:{voiceKind:0,waveA:3,waveB:2,waveReply:1,filterKind:2,fmRatio:3.5,fmIndex:2.5,envelope:4,answerInterval:7,droneWaveA:2,droneWaveB:3,octave:1}}},p=soundMusicalProfile(sp);return{waves:p.voice.waves,filter:p.voice.filter,ratio:p.voice.fmRatio,index:p.voice.fmIndex,envelope:p.voice.envelope,answer:p.voice.answerOffset,drone:p.droneWaves}})()`);
 assert.deepEqual(plain(result),{waves:['square','sawtooth','triangle'],filter:'highpass',ratio:3.5,index:2.5,envelope:4,answer:-12,drone:['sawtooth','square']});
});
test('sustained and breathing expressions remain audible between ordinary note attacks',()=>{
 const p=ctx.soundMusicalProfile(specimen(42));
 for(const expression of [9]){let min=1,max=0;for(let t=0;t<64;t+=.13){const n=ctx.soundPerformanceAt(p,t,0,expression);assert.ok(Number.isFinite(n.frequency));min=Math.min(min,n.envelope);max=Math.max(max,n.envelope);assert.equal(n.glide,true)}assert.ok(min>.1&&max-min>.3)}
});
test('legacy genes remain explicit and unrelated musical dimensions vary independently',()=>{
 const result=run(`(()=>{const old={mode:4,voiceKind:2,expression:7,answerExpression:6},d=normalizedSoundDNA(old,42),sp={seed:42,genome:{soundDNA:d}},base=soundMusicalProfile(sp),wet=soundMusicalProfile({...sp,genome:{soundDNA:{...d,space:1,echo:0,spaceTime:0}}}),fast=soundMusicalProfile({...sp,genome:{soundDNA:{...d,tempo:1.3,cycleRatio:7}}});return{preserved:Object.entries(old).every(([k,v])=>d[k]===v),separate:wet.space===1&&wet.echo===0&&wet.spaceTime===0&&wet.drone===base.drone&&wet.tempo===base.tempo,time:fast.tempo!==base.tempo&&fast.ratio===11/7,upgrade:JSON.stringify(d)===JSON.stringify(normalizedSoundDNA(old,42))}})()`);
 assert.deepEqual(plain(result),{preserved:true,separate:true,time:true,upgrade:true});
});
test('diffuse echoes share loudness correction and all drone sources are removed',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);sp.genome.soundDNA.drone=1;
 e.update([{sp,weight:1}],.5);const v=[...e.voices.values()][0],count=g.nodes.length;
 assert.ok(v.sum.connections.includes(v.delay));assert.ok(v.wet.connections.includes(v.field));assert.ok(v.echoWet.connections.includes(v.field));assert.ok(v.field.connections.includes(v.balance));
 assert.ok(v.feedback.gain.value>0&&v.feedback.gain.value<.4);assert.equal(v.sources.length,5);assert.equal(v.droneA,undefined);assert.equal(v.droneGainA,undefined);
 for(let i=1;i<20;i++){g.context.currentTime=i;e.update([{sp,weight:1}],.5)}assert.equal(g.nodes.length,count);
 e.update([{sp,weight:1}],0);assert.equal(e.output.gain.value,0);e.silence();v.sources[0].onended();assert.ok(v.sources.every(s=>s.stops.length===1));assert.ok(v.nodes.every(n=>n.disconnected));
});
test('weighted loudness correction lifts quiet voices and attenuates strong voices toward the same middle level',()=>{
 const outcomes=[];
 for(const sample of [.018,.045,.12]){
  const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);
  e.update([{sp,weight:1}],.5);const v=[...e.voices.values()][0];v.meter.sample=sample;
  for(let i=1;i<=40;i++){g.context.currentTime=i*.25;e.update([{sp,weight:1}],.5)}
  outcomes.push(sample*v.level.gain);assert.ok(v.level.gain>=.35&&v.level.gain<=3);
 }
 for(const value of outcomes)assert.ok(Math.abs(value-.045)<.00001);
});
test('loudness meter is before morph and volume faders, with an inaudible side branch',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);e.update([{sp,weight:1}],.5);
 const v=[...e.voices.values()][0];v.meter.sample=.09;g.context.currentTime=1;e.update([{sp,weight:1}],.5);
 const gain=v.level.gain;g.context.currentTime=2;e.update([{sp,weight:.01}],0);
 assert.equal(v.level.gain,gain);assert.equal(e.output.gain.value,0);assert.ok(Math.abs(v.mix.gain.value-.0065)<1e-12);
 assert.ok(v.field.connections.includes(v.balance));assert.ok(v.balance.connections.includes(v.mix));assert.equal(v.meter.connections.length,0);
 assert.ok(v.lowGain.connections.includes(v.sum));assert.ok(v.answerGain.connections.includes(v.sum));
});
test('silent rests and invalid meter data cannot increase gain or generate nonfinite automation',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);e.update([{sp,weight:1}],.5);
 const v=[...e.voices.values()][0];v.meter.sample=.09;g.context.currentTime=1;e.update([{sp,weight:1}],.5);const gain=v.level.gain;
 for(const sample of [0,.0001,NaN]){v.meter.sample=sample;g.context.currentTime+=1;e.update([{sp,weight:1}],.5);assert.equal(v.level.gain,gain)}
 e.silence();v.sources[0].onended();assert.ok(v.nodes.every(n=>n.disconnected));
});
test('correction bounds prevent runaway boost and use slow attack and release',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42);e.update([{sp,weight:1}],.5);
 const v=[...e.voices.values()][0];v.meter.sample=.005;g.context.currentTime=1;e.update([{sp,weight:1}],.5);assert.equal(v.level.gain,3);
 assert.equal(v.balance.gain.events.at(-1).constant,2);
 v.level.energy=null;v.meter.sample=.8;g.context.currentTime=2;e.update([{sp,weight:1}],.5);assert.equal(v.level.gain,.35);assert.equal(v.balance.gain.events.at(-1).constant,.8);
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
test('persistent synthesis voices crossfade without restarting the incoming voice at morph adoption',()=>{
 const g=graph(),engine=ctx.createBioticAudioEngine(g.context),a=specimen(731029),b=specimen(571938);
 engine.update([{sp:a,weight:1}],.45);const first=[...engine.voices.values()][0];assert.equal(engine.voices.size,1);
 for(let i=1;i<=20;i++){g.context.currentTime=i*.1;engine.update([{sp:a,weight:1-i/20},{sp:b,weight:i/20}],.45);assert.ok(engine.voices.size<=2);}
 const incoming=[...engine.voices.values()][0];assert.equal(incoming.seed,b.seed);assert.ok(first.sources.every(n=>n.stops.length===1));
 engine.update([{sp:b,weight:1}],.45);assert.equal([...engine.voices.values()][0],incoming);assert.ok(incoming.sources.every(n=>n.starts.length===1));
 assert.ok(g.parameters.every(p=>p.events.every(e=>e.constant>=.01)));assert.ok(engine.output.gain.value<=1);
 first.sources[0].onended();assert.ok(first.nodes.every(n=>n.disconnected));
});
test('pressure changes synthesis parameters; zero volume, silence and recording cleanup are independent',()=>{
 const g=graph(),engine=ctx.createBioticAudioEngine(g.context),sp=specimen(731029);sp.biome.nodes.forEach(n=>{n.pressure=0;n.velocity=0});engine.update([{sp,weight:1}],.5);const voice=[...engine.voices.values()][0],frequency=voice.pores.frequency.value;
 sp.biome.nodes.forEach(n=>{n.pressure=1;n.velocity=.8});engine.update([{sp,weight:1}],0);assert.ok(voice.pores.frequency.value>frequency);assert.equal(engine.output.gain.value,0);
 const recording=engine.recording();assert.equal(recording.track,g.track);assert.equal(engine.output.connections.length,2);recording.disconnect();assert.equal(engine.output.connections.length,1);assert.equal(g.track.stops,1);
 engine.silence();assert.equal(engine.voices.size,0);assert.equal(engine.output.gain.value,0);assert.ok(voice.sources.every(n=>n.stops.length===1));
});
test('musical motifs repeat, transform, rest and stay within a bounded pitch range',()=>{
 const r=run(`(()=>{const sp={seed:856123,genome:makeFounderGenome(856123,0,1),palette:{raw:[[.8,.1,.3],[.1,.7,.6]]}},p=soundMusicalProfile(sp),again=soundMusicalProfile(sp);if(JSON.stringify(p)!==JSON.stringify(again))throw Error('unstable motif');const pitches=new Set();let rests=0,changed=0;for(let t=0;t<p.beats;t+=.05){const a=soundMelodyAt(p,t),repeat=soundMelodyAt(p,t+p.beats),variant=soundMelodyAt(p,t+p.beats*2),returning=soundMelodyAt(p,t+p.beats*8);if(Math.abs(a.frequency-repeat.frequency)>.0001||Math.abs(a.frequency-returning.frequency)>.0001)throw Error('lost motif');if(a.frequency<45||a.frequency>3200||a.envelope<0||a.envelope>1)throw Error('out of range');if(a.envelope>.1)pitches.add(a.frequency.toFixed(2));if(!a.envelope)rests++;if(a.frequency!==variant.frequency)changed++;}return{notes:pitches.size,rests,changed,count:p.events.length};})()`);
 assert.ok(r.notes>=5);assert.ok(r.rests>0);assert.ok(r.changed>0);assert.ok(r.count>=12&&r.count<=24);
});
test('shape and pigment change the musical identity; legacy music genes upgrade deterministically',()=>{
 const r=run(`(()=>{const seed=731029,g=makeFounderGenome(seed,0,1),a={seed,genome:g,palette:{raw:[[1,.1,.1]]}},b={seed,genome:{...g,bulge:1.6,elong:2},palette:{raw:[[.1,.1,1]]}},p=soundMusicalProfile(a),q=soundMusicalProfile(b),old={pitch:.4,recursion:2};return{different:p.key!==q.key,root:p.root!==q.root,mode:p.mode!==q.mode,legacy:JSON.stringify(normalizedSoundDNA(old,seed))===JSON.stringify(normalizedSoundDNA(old,seed)),scaleCount:SOUND_SCALES.length};})()`);
 assert.deepEqual(plain(r),{different:true,root:true,mode:true,legacy:true,scaleCount:18});
});
test('pressure and visible blink change timbre without allocating a graph per note',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(856123),frequencies=new Set(),indices=new Set();Object.assign(sp.genome.soundDNA,{expression:1,octave:1,pitch:.7,tempo:1,fmIndex:.8});
 for(let i=0;i<800;i++){g.context.currentTime=i*.025;sp.biome.nodes.forEach(n=>{n.pressure=.5*Math.sin(i*.07);n.velocity=.3*Math.cos(i*.07)});e.update([{sp,weight:1,visual:{time:i*.025,motion:1,emission:{mode:3,speed:1,strength:1}}}],1);const v=[...e.voices.values()][0];frequencies.add(v.low.frequency.value.toFixed(0));indices.add(v.fmGain.gain.value.toFixed(0));if(i===0)sp.initialNodes=g.nodes.length;assert.equal(g.nodes.length,sp.initialNodes);assert.equal(e.voices.size,1);}
 assert.ok(frequencies.size>=3);assert.ok(indices.size>10);const v=[...e.voices.values()][0];assert.equal(v.sources.length,5);e.silence();assert.ok(v.sources.every(s=>s.stops.length===1));
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
test('acid alternates accents and selected slides while its resonant filter follows note envelopes',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(571938);sp.genome.soundDNA.expression=7;sp.genome.soundDNA.answerExpression=7;sp.genome.soundDNA.glide=.8;
 let slides=0,short=0;const cutoff=new Set(),gates=new Set();for(let i=0;i<400;i++){
  g.context.currentTime=i*.025;e.update([{sp,weight:1,visual:{time:i*.025,motion:1,emission:{mode:3,speed:1,strength:1}}}],1);const v=[...e.voices.values()][0];assert.equal(v.tone.type,'lowpass');assert.equal(v.low.type,v.profile.material.waves[0]);cutoff.add(Math.round(v.tone.frequency.value));const n=ctx.soundPerformanceAt(v.profile,v.beat);if(n.glide)slides++;else short++;gates.add(Math.round(n.accent*10));
 }
 assert.ok(slides>0&&short>0);assert.ok(cutoff.size>20);assert.ok(gates.size>1);
});
test('voice families, expression genes and groove types cover a diverse founder population',()=>{
 const r=run(`(()=>{const voices=new Set(),expressions=new Set(),grooves=new Set();for(let seed=1;seed<=256;seed++){const d=soundFounderDNA(seed);voices.add(d.voiceKind);expressions.add(d.expression);grooves.add(d.phraseKind);}return{voices:voices.size,expressions:expressions.size,grooves:grooves.size};})()`);
 assert.deepEqual(plain(r),{voices:6,expressions:9,grooves:5});
});
test('loudness stage is bounded and monotone, reaches true silence and feeds recording after volume',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42),safety=g.nodes.find(n=>n.type==='safety');assert.ok(safety.curve.length>1000);
 for(let i=0;i<safety.curve.length;i++){assert.ok(Math.abs(safety.curve[i])<.93);if(i)assert.ok(safety.curve[i]>=safety.curve[i-1]);}
 let previous=-1;for(const volume of [0,.1,.45,1]){e.update([{sp,weight:1}],volume);assert.ok(e.output.gain.value>=previous&&e.output.gain.value<=1);previous=e.output.gain.value;if(!volume)assert.equal(previous,0);}
 const record=e.recording();assert.equal(e.output.connections.length,2);record.disconnect();assert.equal(e.output.connections.length,1);
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


