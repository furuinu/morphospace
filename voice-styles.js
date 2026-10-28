/* MORPHOSPACE voice grammars — original synthesized voices, no recorded songs.
 * Gregorian: monophonic modal unison; Hymn: consonant four-part homophony;
 * Sutra: dokkyo-inspired syllabic monotone; Cetacean: whale phrases + transposed
 * dolphin frequency-modulated contours. Presets remain coupled to organism motion.
 */
(function(){
 'use strict';
 const INFO=Object.freeze({
  original:{label:'オリジナル — 生体発声',help:'従来の生体発声。身体運動・発光・表皮変形に連動します。'},
  gregorian:{label:'グレゴリアン — 深い聖歌',help:'低い単旋律の斉唱。自由な呼吸、旋法的な節回しと長い残響。'},
  cetacean:{label:'鯨歌 — イルカとクジラ',help:'低い鯨歌と高いイルカ風の笛声が呼応。超音波成分は可聴域に移します。'},
  hymn:{label:'ヒム — 讃美歌風の合唱',help:'協和する四声体、ゆっくり変わる和音と滑らかな声部進行。'},
  sutra:{label:'読経 — 低い声明風の斉唱',help:'狭い音域と反復的な音節。実在の経文や祈祷文は使用しません。'}
 });
 // Calibrated conservatively against the original. This gain is AFTER all
 // formant and direct-source branches, before the shared safety compressor.
 // Avoid the previous near-unity gain, which made presets much louder.
 const STYLE_GAIN=Object.freeze({
  original:.95,gregorian:.81,cetacean:.09,hymn:.23,sutra:.88
 });
 const gainFor=style=>STYLE_GAIN[Object.prototype.hasOwnProperty.call(STYLE_GAIN,style)?style:'original'];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const cycle=x=>((x%1)+1)%1;
 const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
 const shape=(x,attack=.12,release=.15)=>x<0||x>=1?0:smooth(x/attack)*smooth((1-x)/release);
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 function current(){
  const id=document.getElementById('viewerVoiceStyle')?.value;
  return Object.prototype.hasOwnProperty.call(INFO,id)?id:'original';
 }
 function soften(param,target,now,tau=.12){param?.setTargetAtTime(target,now,tau)}
 function sourceTone(voice,ctx){
  if(!voice?.exciter||voice.directTone)return;
  const direct=ctx.createGain();direct.gain.value=0;
  voice.exciter.connect(direct);direct.connect(voice.out);
  voice.directTone=direct;
  const harmonics=ctx.createBiquadFilter();harmonics.type='highpass';harmonics.frequency.value=180;
  const overtone=ctx.createGain();overtone.gain.value=0;
  voice.exciter.connect(harmonics);harmonics.connect(overtone);overtone.connect(voice.out);
  voice.directOvertone=overtone;
 }
 function restore(state,ctx){
  const now=ctx.currentTime,a=state.ambience;
  soften(a.roomWet.gain,.43,now,.3);soften(a.echoWet.gain,.24,now,.3);
  soften(a.echoFeedback.gain,.26,now,.3);soften(a.dry.gain,.82,now,.3);
  soften(state.comfortLowpass.frequency,4600,now,.3);
  for(const v of [state.body,state.pulse,...state.lights]){
   soften(v.directOvertone?.gain,0,now,.12);
   if(v.exciter&&v.exciter.type!=='sawtooth')v.exciter.type='sawtooth';
   soften(v.directTone?.gain,0,now,.12);
   soften(v.consonantFilter?.frequency,2250,now,.18);
   soften(v.voicedWarmth?.frequency,3100,now,.18);
   if(v.voicingGain)soften(v.voicingGain.gain,.42,now,.18);
   if(v.exciterGain)soften(v.exciterGain.gain,.42,now,.18);
  }
 }
 function apply(state,sp,ctx,t,wave,coupling,blink,voiceDNA){
  if(!state||!sp)return;
  const style=current(),now=ctx.currentTime;
  if(style==='original'){
   if(state.generatedVoiceStyle&&state.generatedVoiceStyle!=='original')restore(state,ctx);
   state.generatedVoiceStyle='original';
   return;
  }
  const all=[state.body,state.pulse,...state.lights],seed=sp.seed>>>0;
  const entering=state.generatedVoiceStyle!==style;
  // Start a recognizable phrase on every switch instead of joining an arbitrary quiet beat.
  if(entering)state.generatedStyleEpoch=t;
  const sTime=Math.max(0,t-(state.generatedStyleEpoch??t));
  state.generatedVoiceStyle=style;
  if(entering){
   for(let i=0;i<all.length;i++){
    const v=all[i];
    sourceTone(v,ctx);
    if(v.exciter)v.exciter.type=style==='cetacean'&&i>=2?'sine':style==='hymn'?'triangle':'sawtooth';
   }
  }
  const morph=clamp(.45+.20*wave+.23*coupling,0,1);
  const human=style==='gregorian'||style==='sutra';
  // Source-filter voice model: the glottal source must pass through the
  // pre-existing F1/F2/F3 filters. Raw sawtooth bypass was the buzzing culprit.
  const set=(v,f,level,vowel=3,color=1,whistle=false,tau=.16)=>{
   const voiceIndex=all.indexOf(v);
   const individuality=human?(1.8*Math.sin(sTime*4.45*2*Math.PI+voiceIndex*.23)+
    .95*Math.sin(sTime*.47+voiceIndex*1.17))*Math.max(.25,Number.isFinite(voiceDNA?.vibrato)?voiceDNA.vibrato:.5):0;
   f*=Math.pow(2,individuality/1200);
   if(!v)return;
   soften(v.out.gain,clamp(level,0,.27),now,tau);
   const fq=clamp(f,60,3300);
   soften(v.exciter?.frequency,fq,now,whistle?.052:.09);
   for(const partial of v.oscillators)
    soften(partial.osc.frequency,clamp(fq*partial.h,25,12500),now,.11);
   const voiced=human?.57*color:whistle?0:.42*color;
   soften(v.voicingGain?.gain,voiced,now,.20);
   soften(v.exciterGain?.gain,voiced,now,.20);
   // No exposed low-frequency direct oscillator in Gregorian or sutra.
   // Hymn receives a modest direct body; cetacean keeps audible FM whistles.
   soften(v.directTone?.gain,human?0:whistle?.73:style==='hymn'?.29:.42,now,.12);
   soften(v.directOvertone?.gain,human?0:whistle?.09:style==='hymn'?.09:.17,now,.13);
   // A little filtered turbulent air models slow exhalation and consonant
   // entrances. Reuse the existing looping noise; no per-frame AudioNodes.
   soften(v.consonantFilter?.frequency,human?(style==='sutra'?1050:1450):2250,now,.20);
   soften(v.consonantGain?.gain,human?clamp(level*1.15,0,.052):0,now,.13);
   soften(v.voicedWarmth?.frequency,human?2300:3100,now,.18);
   soften(v.nasalGain?.gain,0,now,.08);
   const fset=v.vowelBands[clamp(vowel,0,4)];
   for(let j=0;j<3;j++)
    soften(v.formants[j].frequency,clamp(fset[j]*(human?1:(whistle?1:color))*(1+morph*.02),150,4200),now,.19);
   soften(v.tone.frequency,clamp(whistle?fq:fset[0]*color,140,3900),now,.2);
  };
  const a=state.ambience;
  soften(a.roomWet.gain,style==='gregorian'?.53:style==='hymn'?.45:style==='sutra'?.30:.50,now,.35);
  soften(a.echoWet.gain,style==='cetacean'?.34:style==='gregorian'?.18:.10,now,.35);
  soften(a.echoFeedback.gain,style==='cetacean'?.32:.17,now,.35);
  soften(a.dry.gain,style==='gregorian'?.63:style==='cetacean'?.67:.86,now,.35);
  soften(state.comfortLowpass.frequency,style==='gregorian'?2800:style==='sutra'?2900:style==='cetacean'?4300:4800,now,.35);
  if(state.body.acid){soften(state.body.acid.wet.gain,0,now,.24);soften(state.body.acid.dry.gain,1,now,.24)}
  if(state.rhythm){
   soften(state.rhythm.highpass.frequency,60,now,.24);
   soften(state.rhythm.lowpass.frequency,style==='cetacean'?4200:3000,now,.24);
   soften(state.rhythm.wet?.gain,0,now,.24);
   soften(state.rhythm.dry.gain,1,now,.24);
  }
  if(style==='gregorian'){
   // Gregorian-inspired mode uses one common melody without triadic harmonization.
   const duration=9.2+voiceDNA.phraseLength*.55;
   const phase=cycle((sTime+(seed%17)*.09)/duration);
   const segments=[.09,.20,.29,.41,.54,.66,.78,.88,1];
   const index=Math.max(0,segments.findIndex(x=>phase<x));
   const degrees=[0,2,3,2,0,-2,-1,0,0];
   const scale=seed%2?[0,1,3,5,7,8,10]:[0,2,3,5,7,9,10];
   const degree=degrees[index];
   const semi=degree<0?degree:scale[degree%scale.length];
   const fundamental=hz(52+(seed%4)+semi);
   const breath=shape(phase,.065,.17)*(.80+.20*morph);
   // Human unison: three-to-four singers, slightly different vowel colours.
   // Do not stack six near-identical fundamental oscillators.
   const cents=[0,-3.2,2.6,-1.4,0,0],gain=[.17,.095,.075,.055,0,0];
   const vowels=[3,3,4,0,3,3],syll=Math.floor(phase*7);
   all.forEach((v,i)=>set(v,fundamental*Math.pow(2,cents[i]/1200),breath*gain[i],vowels[(i+syll)%4],1,false,.22));
  }else if(style==='hymn'){
   // Bass, tenor, alto, soprano. Keep consonant I-IV-V-I phrase cycles.
   const degrees=[0,5,7,0,9,5,7,0],offset=(seed%7)*.14;
   const chordIndex=Math.floor((sTime+offset)/4.5);
   const base=hz(49+(seed%6)+degrees[((chordIndex%degrees.length)+degrees.length)%degrees.length]);
   const third=seed%2?3:4;
   const parts=[base,base*Math.pow(2,7/12),base*Math.pow(2,(12+third)/12),base*Math.pow(2,19/12)];
   const bar=cycle((sTime+offset)/4.5);
   const phrase=shape(cycle((sTime+offset)/18),.035,.07);
   const syllable=shape(cycle(bar*2),.1,.18);
   const bloom=(.68+.32*syllable)*(.52+.48*phrase)*(.82+.18*morph);
   for(let i=0;i<4;i++)set(all[i],parts[i],bloom*[.16,.13,.14,.13][i],i%2===0?3:0,1,false,.25);
   set(all[4],base,0);set(all[5],base,0);
  }else if(style==='sutra'){
   // Narrow-range, syllabic dokkyo-inspired chant; no actual sacred words.
   const syllable=.66+((seed>>>5)%7)*.036,clock=(sTime+(seed%7)*.09)/syllable;
   const step=Math.floor(clock),pattern=[0,0,0,0,-2,0,0,1,0,0,-1,0];
   const pitch=hz(51+(seed%4)+pattern[((step%12)+12)%12]);
   const stroke=shape(cycle(clock),.15,.26);
   const phrase=shape(cycle(clock/12),.06,.12);
   const level=stroke*phrase*(.80+.20*morph),cent=[0,-2.4,1.8,-1,0,0];
   const vowels=[3,4,3,0,3,1,3,4,3,0,4,3];
   all.forEach((v,i)=>set(v,pitch*Math.pow(2,cent[i]/1200),level*[.23,.145,.108,.067,0,0][i],vowels[(step+(i%2))%vowels.length],1,false,.13));
  }else if(style==='cetacean'){
   // Lower long calls contain successive motifs: unit -> phrase -> repeated theme.
   const period=8+(seed%5)*.8,phase=cycle((sTime+(seed%11)*.15)/period);
   const lowContour=Math.sin(phase*2*Math.PI*1.4+.3)+.3*Math.sin(phase*2*Math.PI*3.1+(seed%13));
   const bass=130+(seed%8)*9; // fundamental is deliberately audible on phone speakers
   const tone=bass*Math.pow(2,(lowContour*4)/12);
   const lowLevel=shape(phase,.12,.20)*(.82+.18*morph);
   set(state.body,tone,lowLevel*.21,3,.54,false,.24);
   const reply=cycle(phase+.39);
   set(state.pulse,tone*1.31*(1+.08*Math.sin(reply*2*Math.PI)),shape(reply,.13,.22)*.12,4,.70,false,.18);
   // Repeat stable individual FM contours, not independent random noise each tick.
   for(let i=0;i<4;i++){
    const rate=2.9+(seed%4)*.29,ph=cycle((sTime+(seed%31)*.04)/rate+i*.245);
    const variation=Math.sin(ph*Math.PI*2*(1.1+((seed>>>i)&3)*.07)+i*.63);
    const rise=.6*Math.sin(ph*Math.PI*2)+(i%2?-.24:.24)*Math.sin(ph*Math.PI*4.4);
    const f=clamp(1120+(seed%170)+i*170+variation*350+rise*310,670,2600);
    const call=ph<.58?shape(ph/.58,.16,.20):0;
    const glow=clamp(blink(i*.31),0,1.6);
    set(state.lights[i],f,call*(.125+i*.014)*(.70+.30*glow),2,1,true,.07);
   }
  }
 }
 // Internal readback is used to verify active synthesis, not just the select's label.
 function applied(state){return state?.generatedVoiceStyle||null;}
 window.MorphVoiceStyles={INFO,current,apply,applied,gainFor};
})();
