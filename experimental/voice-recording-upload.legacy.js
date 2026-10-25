// Archived experimental voice recording/upload and granular playback.
// This module is intentionally NOT loaded by index.html.
// Preserved for future standalone development; depends on legacy page globals.

const voiceSample={mode:'choir',buffer:null,source:null,gain:null,context:null,recorder:null,stream:null,chunks:[],url:null,bank:[],activeSeed:null,grainTime:0,grainPosition:0};
let incomingVoiceSample=null,incomingVoiceSampleTarget=null;
function retireVoiceSample(state){
 if(!state?.gain||!state.context)return;
 state.gain.gain.setTargetAtTime(0,state.context.currentTime,.035);
 setTimeout(()=>{try{state.gain.disconnect();state.filter?.disconnect()}catch(e){}},240);
}
function stopVoiceSample(){if(voiceSample.source){try{voiceSample.source.stop()}catch(e){}try{voiceSample.source.disconnect()}catch(e){}voiceSample.source=null}if(voiceSample.gain)voiceSample.gain.gain.value=0;voiceSample.grainTime=0;voiceSample.grainPosition=0;if(incomingVoiceSample){retireVoiceSample(incomingVoiceSample);incomingVoiceSample=null;incomingVoiceSampleTarget=null;}}
// Recorded voices use the same visual motion clock as the procedural choir.
function renderVoiceSample(quiet,state,sp,fade=1){
 const engine=bioticAudio.engine;
 if(!engine||!bioticAudioRunning()||voiceSample.mode!=='sample'||!voiceSample.buffer)return;
 const ctx=engine.context;
 if(voiceSample.bank.length){
  const seed=sp?.seed??0;
  if(state.activeSeed!==seed){
   state.activeSeed=seed;state.grainTime=0;state.grainPosition=0;
   const status=$('voiceSampleStatus');if(status)status.textContent='混合ボイス：'+voiceSample.bank.length+'素材から同時に3声を生成';
  }
 }
 if(state.context!==ctx){
  // Each morph endpoint owns its own grain scheduler; do not reset the other endpoint.
  if(state.gain){try{state.gain.disconnect();state.filter?.disconnect()}catch(error){}}
  state.gain=ctx.createGain();state.gain.gain.value=0;
  state.filter=ctx.createBiquadFilter();state.filter.type='lowpass';state.filter.frequency.value=6000;
  state.gain.connect(state.filter);state.filter.connect(engine.sampleInput);
  state.context=ctx;
 }
 const t=typeof bodyTime==='number'?bodyTime:ctx.currentTime;
 const motion=$('motion').checked?Number($('motionAmp').value)/100:0;
 const energy=Math.max(.15,Math.min(1.5,motion*(sp?.genome?.dev?.motionEnergy||1)));
 const emission=typeof viewerEmissionValues==='function'?viewerEmissionValues(sp,true):null;
 const blinkSpeed=emission?.speed||.5,blinkMode=emission?.mode||0;
 // Four asynchronous luminous organs create syllabic attacks, while the body carries breath.
 let pulse=0;
 for(let i=0;i<4;i++){
  const phase=t*(.8+blinkSpeed*2.1)*(1+i*.115)+i*1.67+(sp.seed%17)*.21;
  const light=Math.pow(Math.max(0,Math.sin(phase*(blinkMode===0?1:1.25))),6);
  pulse=Math.max(pulse,light);
 }
 const breath=.5+.5*Math.sin(t*(.55+energy*.45)+sp.seed*.001);
 const surface=Math.sin(t*(4.3+energy*3.2)+Math.sin(t*.77)*1.4);
 const vibratoCents=(3+energy*24)*surface*(.4+.6*breath);
 const melody=soundMusicalProfile(sp);
 const beat=((t*melody.tempo)%melody.beats+melody.beats)%melody.beats;
 let note=melody.events[0];
 for(const e of melody.events){if(e.start<=beat)note=e;else break;}
 const scale=melody.scale;
 const index=((note.degree%scale.length)+scale.length)%scale.length;
 const semitone=12*Math.floor(note.degree/scale.length)+scale[index]-scale[0];
 const octaveBounded=Math.max(-7,Math.min(7,semitone));
 const pitch=Math.pow(2,(octaveBounded*100+vibratoCents)/1200);
 // Overlap-add granular pitch shift: playback cursor progresses at original speed,
 // while each short, windowed grain reads at the target pitch ratio.
 // Grain scheduling is ahead of the 25ms visual timer to avoid gaps on mobile Safari.
 // Longer, 75%-overlapped Hann grains reduce audible segmentation of vowels.
 // A 250ms scheduling horizon tolerates Safari main-thread rendering jitter.
 const grainLength=.36,hop=.09,lookahead=.32;
 if(!state.grainTime||state.grainTime<ctx.currentTime-.12){
  state.grainTime=ctx.currentTime+.012;
  state.grainPosition=(ctx.currentTime*.173)%voiceSample.buffer.duration;
 }
 let scheduled=0;
 while(state.grainTime<ctx.currentTime+lookahead&&scheduled++<8){
  const when=state.grainTime;
  const bank=voiceSample.bank.length?voiceSample.bank:[{buffer:voiceSample.buffer}];
  // Three simultaneous sample layers share one melodic note and one articulation envelope.
  // Deterministic rotating selection makes a composite timbre, not three independent songs.
  const layers=Math.min(3,bank.length),phraseIndex=Math.floor(when/5.5),seed=(sp?.seed??0)>>>0;
  for(let layer=0;layer<layers;layer++){
   const hash=(Math.imul((phraseIndex+1)*7+layer*101+seed,2654435761)>>>0);
   const item=bank[hash%bank.length],src=ctx.createBufferSource(),env=ctx.createGain();
   src.buffer=item.buffer;src.loop=true;
   src.playbackRate.value=pitch*Math.pow(2,([-.035,0,.035][layer]||0)/12);
   const offset=(state.grainPosition+(hash%1000)/1000*.08)%item.buffer.duration;
   const steps=16;
   env.gain.setValueAtTime(0,when);
   for(let k=1;k<=steps;k++){
    const window=.5-.5*Math.cos(2*Math.PI*k/steps);
    env.gain.linearRampToValueAtTime(window*.25/layers,when+grainLength*k/steps);
   }
   src.connect(env);env.connect(state.gain);
   src.start(when,offset);src.stop(when+grainLength+.008);
   src.onended=()=>{try{src.disconnect();env.disconnect()}catch(e){}};
  }
  state.grainTime+=hop;
  state.grainPosition=(state.grainPosition+hop)%voiceSample.buffer.duration;
 }
 // Keep a low, living breath floor; light pulses articulate without fully muting long notes.
 // Strong audible contrast: separated syllabic calls rather than near-continuous loop.
 // Smooth attack/release prevents clicks; occasional sustained phrases follow body motion.
 // Long breath phrases with a soft underlying voice; luminous pulses add articulation
 // rather than repeatedly chopping the entire choir to silence.
 const cycle=(t*(.33+blinkSpeed*.24)+sp.seed*.001)%7;
 const fadeIn=Math.min(1,cycle/1.3),fadeOut=Math.min(1,(7-cycle)/1.5);
 const breathEnvelope=Math.max(0,Math.min(fadeIn,fadeOut));
 const phrase=.24+.76*breathEnvelope*(.78+.22*breath);
 const articulation=.85+.15*.20*pulse;
 const level=quiet?0:phrase*articulation*.73*fade*Number($('viewerSoundVolume').value)/100;
 state.gain.gain.setTargetAtTime(level,ctx.currentTime,.16);
 state.filter.frequency.setTargetAtTime(1700+2800*breathEnvelope+170*pulse,ctx.currentTime,.12);
}
function updateVoiceSample(quiet=false){
 if(!bioticAudio.engine||!bioticAudioRunning()||voiceSample.mode!=='sample'||!voiceSample.buffer){stopVoiceSample();return;}
 const m=viewer.morph;
 if(m?.source&&m?.target){
  if(incomingVoiceSampleTarget!==m.target){
   if(incomingVoiceSample)retireVoiceSample(incomingVoiceSample);
   incomingVoiceSample={context:null,gain:null,filter:null,activeSeed:null,grainTime:0,grainPosition:0};
   incomingVoiceSampleTarget=m.target;
  }
  const angle=clamp(m.t,0,1)*Math.PI/2;
  renderVoiceSample(quiet,voiceSample,m.source,Math.cos(angle));
  renderVoiceSample(quiet,incomingVoiceSample,m.target,Math.sin(angle));
 }else{
  if(incomingVoiceSample){
   if(incomingVoiceSampleTarget===spec){
    retireVoiceSample({gain:voiceSample.gain,filter:voiceSample.filter,context:voiceSample.context});
    Object.assign(voiceSample,incomingVoiceSample);
   }else retireVoiceSample(incomingVoiceSample);
   incomingVoiceSample=null;incomingVoiceSampleTarget=null;
  }
  renderVoiceSample(quiet,voiceSample,spec,1);
 }
}


(function(){
 const status=$('voiceSampleStatus'),preview=$('voiceSamplePreview'),file=$('voiceSampleFile');
 const message=t=>{status.textContent=t};
 async function load(blob){
  if(!blob||blob.size>30*1024*1024){message('30MB以下の音声を選択してください。');return;}
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)throw Error('音声デコード非対応');
   const context=bioticAudio.engine?.context||new Context();
   const buffer=await context.decodeAudioData(await blob.arrayBuffer());
   if(!buffer.duration)throw Error('空の音声です');
   stopVoiceSample();voiceSample.bank=[];voiceSample.activeSeed=null;voiceSample.buffer=buffer;
   if(voiceSample.url)URL.revokeObjectURL(voiceSample.url);
   voiceSample.url=URL.createObjectURL(blob);preview.src=voiceSample.url;preview.hidden=false;
   $('voiceSampleMode').value='sample';voiceSample.mode='sample';
   message('読み込み完了：'+buffer.duration.toFixed(1)+'秒。生体の動きで音量とビブラートが変化します。');
   if(context!==bioticAudio.engine?.context)void context.close();
   if(bioticAudioRunning())tickBioticAudio();else message('音源を読み込みました。画面をタップして活動音を再開してください。');
  }catch(e){message('音声を読み込めません：'+e.message);}
 }
 async function loadMany(blobs){
  const unique=[...new Map(blobs.map(b=>[b.name.replace(/ \\(\\d+\\)(?=\\.mp3$)/i,''),b])).values()];
  if(unique.length===1){voiceSample.bank=[];voiceSample.activeSeed=null;await load(unique[0]);return;}
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context){message('音声デコード非対応');return;}
  const context=bioticAudio.engine?.context||new Context();
  const bank=[];let failures=0;
  for(const blob of unique){
   if(blob.size>30*1024*1024){failures++;continue;}
   try{const buffer=await context.decodeAudioData(await blob.arrayBuffer());if(buffer.duration)bank.push({name:blob.name,buffer});else failures++;}
   catch(e){failures++;}
  }
  if(context!==bioticAudio.engine?.context)void context.close();
  if(!bank.length){message('音源を読み込めませんでした。');return;}
  stopVoiceSample();voiceSample.bank=bank;voiceSample.activeSeed=null;voiceSample.buffer=bank[0].buffer;
  if(voiceSample.url)URL.revokeObjectURL(voiceSample.url);
  voiceSample.url=URL.createObjectURL(unique[0]);preview.src=voiceSample.url;preview.hidden=false;
  voiceSample.mode='sample';$('voiceSampleMode').value='sample';
  message(bank.length+'種類を読み込みました。生体ごとに音源を自動選択します。'+(failures?' 読込失敗：'+failures:''));
  if(bioticAudioRunning())tickBioticAudio();
 }
 $('voiceSampleMode').onchange=e=>{voiceSample.mode=e.target.value;stopVoiceSample();stopPureChoir();if(bioticAudioRunning())tickBioticAudio()};
 $('voiceSampleUpload').onclick=()=>file.click();
 file.onchange=()=>{if(file.files?.length)void loadMany([...file.files]);file.value=''};
 $('voiceSampleClear').onclick=()=>{stopVoiceSample();voiceSample.buffer=null;voiceSample.bank=[];voiceSample.activeSeed=null;voiceSample.mode='choir';$('voiceSampleMode').value='choir';if(voiceSample.url)URL.revokeObjectURL(voiceSample.url);voiceSample.url=null;preview.removeAttribute('src');preview.hidden=true;message('録音音源を解除しました。');if(bioticAudioRunning())tickBioticAudio()};
 let recordingPreviousSession=null;
 function restoreRecordingSession(){
  if(navigator.audioSession&&recordingPreviousSession!==null){
   try{navigator.audioSession.type=recordingPreviousSession}catch(e){console.info('AudioSession restore:',e)}
  }
  recordingPreviousSession=null;
 }
 $('voiceRecordStart').onclick=async()=>{
  let stream=null;
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('このブラウザは録音に対応していません');
   stopBioticAudio('録音中は活動音を停止します。');
   preview.pause();
   if(navigator.audioSession){
    try{recordingPreviousSession=navigator.audioSession.type;navigator.audioSession.type='play-and-record';}
    catch(e){console.info('AudioSession capture switch unavailable:',e)}
   }
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   voiceSample.stream=stream;
   const recorder=new MediaRecorder(stream);voiceSample.recorder=recorder;voiceSample.chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)voiceSample.chunks.push(e.data)};
   recorder.onerror=e=>message('録音エラー：'+(e.error?.message||'録音を継続できません'));
   recorder.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());voiceSample.stream=null;
    restoreRecordingSession();$('voiceRecordStart').disabled=false;$('voiceRecordStop').disabled=true;
    if(voiceSample.chunks.length)void load(new Blob(voiceSample.chunks,{type:recorder.mimeType||'audio/mp4'}));
    else message('録音データがありません。もう一度お試しください。');
   };
   recorder.start();$('voiceRecordStart').disabled=true;$('voiceRecordStop').disabled=false;message('録音中…停止ボタンで確定します。');
  }catch(e){
   if(stream)stream.getTracks().forEach(t=>t.stop());
   voiceSample.stream=null;restoreRecordingSession();
   $('voiceRecordStart').disabled=false;$('voiceRecordStop').disabled=true;
   message('録音できません：'+e.message);
  }
 };
 $('voiceRecordStop').onclick=()=>{if(voiceSample.recorder?.state==='recording')voiceSample.recorder.stop()};
})()
