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
 const context={currentTime:0,sampleRate:8000,state:'running',destination:node('destination'),createGain:()=>Object.assign(node('gain'),{gain:parameter()}),createBiquadFilter:()=>Object.assign(node('filter'),{frequency:parameter(),Q:parameter()}),createDynamicsCompressor:()=>Object.assign(node('limiter'),Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,parameter()]))),createBuffer:(channels,length,rate)=>{assert.equal(channels,1);return{getChannelData:()=>new Float32Array(length)}},createWaveShaper:()=>node('safety'),createOscillator:()=>source('oscillator'),createBufferSource:()=>source('noise'),createMediaStreamDestination:()=>Object.assign(node('recording'),{stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}})};
 return{context,nodes,parameters,track};
}
function specimen(seed){return{seed,genome:{soundDNA:plain(run(`soundFounderDNA(${seed})`))},biome:{nodes:[{pressure:.4,velocity:.2},{pressure:-.2,velocity:-.1}]}}}
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
 assert.deepEqual(plain(r),{different:true,root:true,mode:true,legacy:true,scaleCount:6});
});
test('pressure and visible blink change timbre without allocating a graph per note',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(856123),frequencies=new Set(),indices=new Set();
 for(let i=0;i<800;i++){g.context.currentTime=i*.025;sp.biome.nodes.forEach(n=>{n.pressure=.5*Math.sin(i*.07);n.velocity=.3*Math.cos(i*.07)});e.update([{sp,weight:1,visual:{time:i*.025,motion:1,emission:{mode:3,speed:1,strength:1}}}],1);const v=[...e.voices.values()][0];frequencies.add(v.low.frequency.value.toFixed(0));indices.add(v.fmGain.gain.value.toFixed(0));if(i===0)sp.initialNodes=g.nodes.length;assert.equal(g.nodes.length,sp.initialNodes);assert.equal(e.voices.size,1);}
 assert.ok(frequencies.size>10);assert.ok(indices.size>10);const v=[...e.voices.values()][0];assert.equal(v.sources.length,5);e.silence();assert.ok(v.sources.every(s=>s.stops.length===1));
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
  g.context.currentTime=i*.025;e.update([{sp,weight:1,visual:{time:i*.025,motion:1,emission:{mode:3,speed:1,strength:1}}}],1);const v=[...e.voices.values()][0];assert.equal(v.tone.type,'lowpass');assert.ok(['square','sawtooth'].includes(v.low.type));cutoff.add(Math.round(v.tone.frequency.value));const n=ctx.soundPerformanceAt(v.profile,v.beat);if(n.glide)slides++;else short++;gates.add(Math.round(n.accent*10));
 }
 assert.ok(slides>0&&short>0);assert.ok(cutoff.size>20);assert.ok(gates.size>1);
});
test('voice families, expression genes and groove types cover a diverse founder population',()=>{
 const r=run(`(()=>{const voices=new Set(),expressions=new Set(),grooves=new Set();for(let seed=1;seed<=256;seed++){const d=soundFounderDNA(seed);voices.add(d.voiceKind);expressions.add(d.expression);grooves.add(d.phraseKind);}return{voices:voices.size,expressions:expressions.size,grooves:grooves.size};})()`);
 assert.deepEqual(plain(r),{voices:6,expressions:8,grooves:5});
});
test('loudness stage is bounded and monotone, reaches true silence and feeds recording after volume',()=>{
 const g=graph(),e=ctx.createBioticAudioEngine(g.context),sp=specimen(42),safety=g.nodes.find(n=>n.type==='safety');assert.ok(safety.curve.length>1000);
 for(let i=0;i<safety.curve.length;i++){assert.ok(Math.abs(safety.curve[i])<.93);if(i)assert.ok(safety.curve[i]>=safety.curve[i-1]);}
 let previous=-1;for(const volume of [0,.1,.45,1]){e.update([{sp,weight:1}],volume);assert.ok(e.output.gain.value>=previous&&e.output.gain.value<=1);previous=e.output.gain.value;if(!volume)assert.equal(previous,0);}
 const record=e.recording();assert.equal(e.output.connections.length,2);record.disconnect();assert.equal(e.output.connections.length,1);
});
function controller(resume){
 const g=graph(),elements={},intervals=new Map(),timeouts=[],listeners={};let timer=0;
 g.context.resume=resume||(()=>{g.context.state='running';return Promise.resolve()});g.context.suspend=()=>{g.context.state='suspended';return Promise.resolve()};
 const f={console,seedRng:ctx.seedRng,normalizedSoundDNA:ctx.normalizedSoundDNA,soundPulseTree:ctx.soundPulseTree,soundPulseValue:ctx.soundPulseValue,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),createBioticAudioEngine:ctx.createBioticAudioEngine,window:{AudioContext:function(){return g.context}},spec:specimen(731029),selected:0,animating:true,viewer:{morph:null},nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,videoResult:null,document:{hidden:false,addEventListener:(name,fn)=>listeners[name]=fn},localStorage:{getItem:()=>null,setItem(){}},$:id=>elements[id]||(elements[id]={value:'45',textContent:'',disabled:false,open:false,classList:{contains:()=>true},setAttribute(k,v){this[k]=v}}),setInterval:fn=>{intervals.set(++timer,fn);return timer},clearInterval:id=>intervals.delete(id),setTimeout:fn=>{timeouts.push(fn);return timeouts.length},clearTimeout(){}};
 vm.createContext(f);vm.runInContext(src.slice(src.indexOf('const bioticAudio='),src.indexOf('function videoStatus(')),f);f.audio=vm.runInContext('bioticAudio',f);return{f,g,elements,intervals,timeouts,listeners};
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

