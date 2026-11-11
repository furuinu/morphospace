const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};
function runtime(extra={}){
 const context={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),...extra};
 vm.createContext(context);vm.runInContext(between('const CHOIR_BASS_LEVEL=','// Synchronous, equal-power fade'),context);
 return {context,run:code=>vm.runInContext(code,context)};
}
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

test('the bass is the body pitch class folded into 55-110 Hz',()=>{
 const {run}=runtime();
 for(const body of [293.66,311.13,349.23,392,415.3,220,880]){
  const hz=run(`choirBassFrequency(${body})`),octaves=Math.log2(body/hz);
  assert.ok(hz>=55&&hz<110,body+' -> '+hz);
  assert.ok(Math.abs(octaves-Math.round(octaves))<1e-9,'whole octaves below the body voice');
 }
 assert.ok(Math.abs(run('choirBassFrequency(293.66)')-73.415)<.01,'D4 body voice gives D2');
});
test('the bass swells with the body heave and rests in the troughs',()=>{
 const wave={value:0};
 const {context,run}=runtime({suspensionAmount:()=>1,environmentTime:0,suspensionWave:()=>wave.value});
 const at=h=>{wave.value=h;return run('choirBassSwell({seed:5},0)')};
 assert.equal(at(-1),0);assert.equal(at(-.15),0,'silent while the body is low');
 assert.equal(at(.85),1);assert.equal(at(1),1);
 let previous=0;for(let h=-.15;h<=.85;h+=.02){const v=at(h);assert.ok(v>=previous-1e-12&&v<=1);previous=v;}
 // With buoyancy off it still breathes on its own, and is silent for a good part of each cycle.
 context.suspensionAmount=()=>0;
 let silent=0,loud=0;for(let t=0;t<60;t+=.05){const v=run(`choirBassSwell({seed:5},${t})`);assert.ok(v>=0&&v<=1);if(v<.02)silent++;if(v>.8)loud++;}
 assert.ok(silent/1200>.3,'rests '+silent/1200);assert.ok(loud/1200>.15,'and swells '+loud/1200);
 const bare=runtime();assert.doesNotThrow(()=>bare.run('choirBassSwell({seed:5},1)'),'no buoyancy code at all');
});
test('voices are placed where their sources appear on screen',()=>{
 const sp={emissionSites:[[-.3,0,0,.4],[.3,0,0,.4],[0,.5,0,.4],[2,0,0,.4]]};
 const {context,run}=runtime({selected:0,lastSceneViewProj:identity,lastBodyBase:identity,sp});
 let p=run('choirPlacement(sp)');
 assert.ok(p.lights[0]<-.5&&p.lights[1]>.5,'left and right sites: '+p.lights);
 assert.equal(p.lights[2],0,'a site on the centre line stays central');
 assert.equal(p.lights[3],.85,'placement never reaches a hard side');
 assert.equal(p.body,0);
 // Turning the body half a turn about the vertical axis swaps the sides.
 context.lastBodyBase=[-1,0,0,0,0,1,0,0,0,0,-1,0,0,0,0,1];p=run('choirPlacement(sp)');
 assert.ok(p.lights[0]>.5&&p.lights[1]<-.5);
 // A body drawn off-centre pulls its own voice half as far as its lights.
 context.lastBodyBase=[1,0,0,0,0,1,0,0,0,0,1,0,.2,0,0,1];p=run('choirPlacement(sp)');
 assert.ok(Math.abs(p.body-.2)<1e-9&&p.lights[2]>p.body);
 // Behind the camera, missing sites, the gallery and the first frame are all central.
 context.lastBodyBase=identity;context.lastSceneViewProj=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,-1];
 assert.deepEqual(JSON.parse(JSON.stringify(run('choirPlacement(sp)'))),{body:0,lights:[0,0,0,0]});
 context.lastSceneViewProj=identity;
 assert.deepEqual(JSON.parse(JSON.stringify(run('choirPlacement({})'))).lights,[0,0,0,0]);
 for(const off of ['selected=-1','lastSceneViewProj=null','lastBodyBase=null']){
  const fresh=runtime({selected:0,lastSceneViewProj:identity,lastBodyBase:identity,sp});fresh.run(off);
  assert.deepEqual(JSON.parse(JSON.stringify(fresh.run('choirPlacement(sp)'))),{body:0,lights:[0,0,0,0]},off);
 }
});
test('the choir graph is stereo where supported and unchanged where it is not',()=>{
 const graph=between('function renderPureChoir(','// ---- Stereo placement and bass foundation');
 assert.ok(graph.includes("const placement=()=>typeof ctx.createStereoPanner==='function'?ctx.createStereoPanner():null;"));
 assert.ok(graph.includes('const bodyBus=state.pans.body||state.master;'));
 assert.ok(graph.includes('if(place){tamer.disconnect();tamer.connect(place);place.connect(rhythmInput);state.pans.lights.push(place);}'));
 assert.ok(graph.includes('impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*duration),ctx.sampleRate);')&&graph.includes('for(let channel=0;channel<2;channel++){'),'the room answers differently at each ear');
 assert.ok(graph.includes("for(const [h,level] of [[1,1],[2,.34],[3,.11]]){"),'upper partials carry the bass on small speakers');
 assert.ok(graph.includes('tone.connect(out);out.connect(state.master);'),'the bass follows the choir volume and fades');
 assert.ok(graph.includes('if(stepChoirArpeggio(arp,t,Math.max(state.grooveTime,...state.lightTimes),interval)){'),'the arpeggio watches the pulse and every luminous voice');
 assert.ok(graph.includes('const hz=root*Math.pow(2,chordIntervals[tone]/12);'),'each voice holds one tone of the shared chord');
 assert.ok(graph.includes('v.gain.gain.setTargetAtTime(CHOIR_BASS_LEVEL*v.level*choirBassVoiceEnvelope(t-v.start,v.hold,interval)*swell,ctx.currentTime,.02);'));
 assert.ok(graph.includes('for(let v=0;v<4;v++){'),'four voices, so notes can ring together');
 assert.ok(html.includes('for(const voice of [state.body,state.pulse,...state.lights,state.bass].filter(Boolean)){'),'the bass oscillators are stopped with the rest');
 const engine=between('function createBioticAudioEngine(','const voices=new Map()');
 assert.ok(engine.includes("if(place){place.pan.value=delayTime<.25?-.6:delayTime>.4?.6:0;damping.connect(place);place.connect(reverbWet);}"));
 assert.ok(engine.includes('else damping.connect(reverbWet);'));
 assert.ok(html.includes(' lastSceneViewProj=mul4(pr,cam);\n if(suspension.live)lastBodyBase=base;'),'thumbnails do not move the voices');
});

test('the bass walks every chord tone, rising or falling',()=>{
 const {run}=runtime();
 const patterns=JSON.parse(run('JSON.stringify(CHOIR_ARP_PATTERNS)'));
 assert.ok(patterns.length>=6);
 for(const pattern of patterns){assert.deepEqual([...new Set(pattern)].sort(),[0,1,2,3],'root, third, fifth and octave all appear');assert.ok(pattern[0]===0||pattern[0]===3,'a cycle starts on the root or the octave');}
 assert.ok(patterns.some(p=>p[0]===3),'some orders fall');
 for(let seed=0;seed<4000;seed+=97){const i=run(`choirArpInterval(${seed},.5)`);assert.ok(i>=.55&&i<=1.02,'interval '+i);}
 assert.ok(run('choirArpInterval(0,1)')<run('choirArpInterval(0,0)'),'active organisms walk faster');
 // Each organism mostly keeps its own order but sometimes borrows another.
 for(const seed of [5,777,123456]){
  const used=new Map();for(let phrase=0;phrase<60;phrase++){const k=run(`JSON.stringify(choirBassPattern(${seed},${phrase}))`);used.set(k,(used.get(k)||0)+1);}
  const counts=[...used.values()].sort((a,b)=>b-a);
  assert.ok(counts[0]>=27&&counts[0]>2*counts[1]&&used.size>=3,'seed '+seed+': '+counts);
 }
});
test('articulations vary from phrase to phrase, with a different taste per organism',()=>{
 const {run}=runtime();
 const kinds=JSON.parse(run('JSON.stringify(CHOIR_BASS_ARTICULATIONS)'));
 assert.deepEqual(kinds,['pluck','legato','stack','block','strum','pedal','dyad']);
 const everywhere=new Set(),favourites=new Set();
 for(let seed=0;seed<200;seed++){
  const seen=new Map();let changes=0,previous=null;
  for(let phrase=0;phrase<40;phrase++){const a=run(`choirBassArticulation(${seed*7919},${phrase})`);everywhere.add(a);seen.set(a,(seen.get(a)||0)+1);if(previous&&a!==previous)changes++;previous=a;}
  assert.ok(seen.size>=4,'seed '+seed+' uses '+seen.size+' articulations');
  assert.ok(changes>=15,'and keeps changing: '+changes);
  favourites.add([...seen.entries()].sort((a,b)=>b[1]-a[1])[0][0]);
 }
 assert.equal(everywhere.size,7);
 assert.ok(favourites.size>=5,'organisms differ in which articulation they favour: '+favourites.size);
 assert.equal(run('choirBassArticulation(42,7)'),run('choirBassArticulation(42,7)'),'deterministic');
});
test('each articulation rings the way its name says',()=>{
 const {run}=runtime();
 const interval=.7;
 // Play two cycles at exact step times and count voices that are clearly sounding at each moment.
 const play=(articulation,pattern)=>{
  const L=pattern.length,starts=[];
  for(let step=0;step<L*2;step++){
   const events=JSON.parse(run(`JSON.stringify(choirBassStepEvents('${articulation}',${JSON.stringify(pattern)},${step%L},${interval}))`));
   for(const e of events)starts.push({at:step*interval+e.delay,tone:e.tone,hold:e.hold,level:e.level});
  }
  starts.sort((a,b)=>a.at-b.at);
  const sounding=[];
  for(let t=0;t<L*2*interval;t+=.01){
   let count=0;
   for(let tone=0;tone<4;tone++){
    const mine=starts.filter(s=>s.tone===tone&&s.at<=t+1e-9);if(!mine.length)continue;
    const last=mine[mine.length-1];
    if(last.level*run(`choirBassVoiceEnvelope(${t-last.at},${last.hold},${interval})`)>.15)count++;
   }
   sounding.push(count);
  }
  return {max:Math.max(...sounding),starts,silentShare:sounding.filter(c=>c===0).length/sounding.length};
 };
 const up=[0,1,2,3];
 assert.ok(play('pluck',up).max<=1,'pluck: one note at a time');
 const legato=play('legato',up).max;assert.ok(legato>=2&&legato<=3,'legato: each note overlaps the next: '+legato);
 assert.ok(play('stack',up).max>=4,'stack: the cycle builds into the full chord');
 const block=play('block',up);assert.ok(block.max>=4,'block: the chord is struck at once');
 assert.equal(block.starts.filter(s=>s.at===0).length,4);
 const strum=play('strum',up).starts.filter(s=>s.at<interval).map(s=>s.at);
 assert.equal(strum.length,4);for(let i=1;i<strum.length;i++)assert.ok(strum[i]>strum[i-1],'strum: the chord is rolled');
 assert.ok(strum[3]<interval*.3,'and rolled quickly');
 const pedal=play('pedal',up);assert.ok(pedal.max>=2,'pedal: a held root under the moving tones');
 const rootHold=JSON.parse(run(`JSON.stringify(choirBassStepEvents('pedal',[0,1,2,3],0,${interval}))`)).find(e=>e.tone===0);
 assert.ok(rootHold.hold>=4*interval-1e-9,'the root is held for the whole cycle');
 assert.ok(play('dyad',up).max>=2,'dyad: two tones together');
 // Rests are part of the variety, but no articulation leaves most of the cycle empty.
 for(const a of ['pluck','legato','stack','block','strum','pedal','dyad'])assert.ok(play(a,[0,2,1,3,1,2]).silentShare<.75,a);
});
test('a bass voice envelope rises, holds and releases smoothly',()=>{
 const {run}=runtime();
 const env=(a,h)=>run(`choirBassVoiceEnvelope(${a},${h},.7)`);
 assert.equal(env(-1,0),0);assert.equal(env(0,0),0);assert.ok(Math.abs(env(.035,0)-1)<1e-9);
 assert.ok(env(.7,0)<.05,'a plucked note has nearly faded by the next step');
 assert.ok(env(1.4,1.4)>.25,'a held note is still sounding at the end of its hold');
 assert.ok(Math.abs(env(1.4,1.4)-env(1.4+1e-6,1.4))<1e-4,'no jump when the release starts');
 assert.ok(env(1.4+.7,1.4)<.02,'and it is gone a step later');
 let previous=1;for(let a=.035;a<3;a+=.01){const v=env(a,1.4);assert.ok(v<=previous+1e-12);previous=v;}
});
test('bass notes land in the gaps between the high voices and are never silenced by them',()=>{
 const {run}=runtime();
 const simulate=(highEvery,seconds=120)=>{
  run('arp={step:-1,last:-100,next:0}');
  let rand=12345;const rnd=()=>(rand=(rand*1103515245+12345)%2147483648)/2147483648;
  const highs=[];let nextHigh=.3,lastHigh=-100;const bass=[];
  for(let k=0;k<seconds*60;k++){
   const t=k/60;
   if(t>=nextHigh){lastHigh=t;highs.push(t);nextHigh=t+highEvery*(.5+rnd());}
   if(run(`stepChoirArpeggio(arp,${t},${lastHigh},.7)`))bass.push(t);
  }
  const gaps=bass.map(b=>Math.min(...highs.filter(h=>h<=b).map(h=>b-h).concat([99]))).filter(g=>g<99);
  // Where each note sits between the onsets around it: 0.5 is exactly midway, random timing averages 0.25.
  const centred=bass.map(b=>{const before=highs.filter(h=>h<=b),after=highs.filter(h=>h>b);if(!before.length||!after.length)return null;const p=b-before[before.length-1],n=after[0]-b;return Math.min(p,n)/(p+n)}).filter(v=>v!==null);
  return {notes:bass.length,gaps,minGap:Math.min(...gaps),meanGap:gaps.reduce((a,b)=>a+b,0)/gaps.length,meanStep:(bass[bass.length-1]-bass[0])/(bass.length-1),centred:centred.reduce((a,b)=>a+b,0)/centred.length};
 };
 const sparse=simulate(1.4);
 assert.ok(sparse.minGap>=.16-1/60,'with room to spare every note keeps the full guard: '+sparse.minGap.toFixed(3));
 assert.ok(sparse.meanGap>.3,'and sits mid-gap: '+sparse.meanGap.toFixed(3));
 assert.ok(sparse.meanStep<1.1,'the walk keeps its pace: '+sparse.meanStep.toFixed(2));
 for(const every of [.35,.14,.08]){
  const busy=simulate(every);
  assert.ok(busy.notes>60,'high onsets every ~'+every+' s do not silence the bass: '+busy.notes+' notes');
  assert.ok(busy.minGap>=.02-1e-9,'never closer than the minimum gap: '+busy.minGap.toFixed(3));
  assert.ok(busy.centred>.32,'notes sit well between the high onsets ('+every+'): '+busy.centred.toFixed(3));
  assert.ok(busy.meanStep<1.8,'pace '+busy.meanStep.toFixed(2));
 }
 assert.equal(run('choirArpClearance(1.2,.7)'),0,'a badly overdue note plays even if a high voice starts in the same frame');
 // One sound update per second of body time with a light onset on every update: the walk still goes on.
 run('arp={step:-1,last:-100,next:0}');let slow=0;for(let t=0;t<30;t+=1.08)if(run(`stepChoirArpeggio(arp,${t},${t},.7)`))slow++;
 assert.ok(slow>=12,'low frame rate: '+slow+' notes');
 const levels=[0,.3,.5,.9,1.2,2].map(o=>run(`choirArpClearance(${o},.7)`));
 for(let i=1;i<levels.length;i++)assert.ok(levels[i]<=levels[i-1],'the accepted gap only shrinks while waiting');
 // A reset of the body clock does not leave the bass stuck in the future.
 run('arp={step:3,last:50,next:50.7}');
 assert.equal(run('stepChoirArpeggio(arp,51,49,.7)'),true);
});
