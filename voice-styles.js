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
 }
 function restore(state,ctx){
  const now=ctx.currentTime,a=state.ambience;
  soften(a.roomWet.gain,.43,now,.3);soften(a.echoWet.gain,.24,now,.3);
  soften(a.echoFeedback.gain,.26,now,.3);soften(a.dry.gain,.82,now,.3);
  soften(state.comfortLowpass.frequency,4600,now,.3);
  for(const v of [state.body,state.pulse,...state.lights]){
   if(v.exciter&&v.exciter.type!=='sawtooth')v.exciter.type='sawtooth';
   soften(v.directTone?.gain,0,now,.12);
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
  state.generatedVoiceStyle=style;
  if(entering){
   for(let i=0;i<all.length;i++){
    const v=all[i];
    if(style==='cetacean'&&i>=2)sourceTone(v,ctx);
    if(v.exciter)v.exciter.type=style==='cetacean'&&i>=2?'sine':'sawtooth';
   }
  }
  const morph=clamp(.45+.20*wave+.23*coupling,0,1);
  const set=(v,f,level,vowel=3,color=1,whistle=false,tau=.16)=>{
   if(!v)return;
   soften(v.out.gain,clamp(level,0,.27),now,tau);
   const fq=clamp(f,60,3300);
   soften(v.exciter?.frequency,fq,now,whistle?.052:.09);
   for(const partial of v.oscillators)
    soften(partial.osc.frequency,clamp(fq*partial.h,25,12500),now,.11);
   soften(v.voicingGain?.gain,whistle?0:.42*color,now,.2);
   soften(v.exciterGain?.gain,.42*color,now,.2);
   soften(v.directTone?.gain,whistle?.7:0,now,.18);
   soften(v.consonantGain?.gain,0,now,.08);
   soften(v.nasalGain?.gain,0,now,.08);
   const fset=v.vowelBands[clamp(vowel,0,4)];
   for(let j=0;j<3;j++)
    soften(v.formants[j].frequency,clamp(fset[j]*(whistle?1:color)*(1+morph*.02),150,4200),now,.18);
   soften(v.tone.frequency,clamp(whistle?fq:fset[0]*color,140,3900),now,.2);
  };
  const a=state.ambience;
  soften(a.roomWet.gain,style==='gregorian'?.77:style==='hymn'?.56:style==='sutra'?.35:.63,now,.35);
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
   const phase=cycle((t+(seed%17)*.09)/duration);
   const segments=[.09,.20,.29,.41,.54,.66,.78,.88,1];
   const index=Math.max(0,segments.findIndex(x=>phase<x));
   const degrees=[0,2,3,2,0,-2,-1,0,0];
   const scale=seed%2?[0,1,3,5,7,8,10]:[0,2,3,5,7,9,10];
   const degree=degrees[index];
   const semi=degree<0?degree:scale[degree%scale.length];
   const fundamental=hz(48+(seed%5)+semi);
   const breath=shape(phase,.045,.12)*(.80+.20*morph);
   const cents=[0,-3,2.3,-1.8,2.7,3.3],gain=[.19,.12,.11,.085,.07,.06];
   all.forEach((v,i)=>set(v,fundamental*Math.pow(2,cents[i]/1200),breath*gain[i],i%3===0?3:4,.80,false,.2));
  }else if(style==='hymn'){
   // Bass, tenor, alto, soprano. Keep consonant I-IV-V-I phrase cycles.
   const degrees=[0,5,7,0,9,5,7,0],offset=(seed%7)*.14;
   const chordIndex=Math.floor((t+offset)/4.5);
   const base=hz(47+(seed%6)+degrees[((chordIndex%degrees.length)+degrees.length)%degrees.length]);
   const third=seed%2?3:4;
   const parts=[base,base*Math.pow(2,7/12),base*Math.pow(2,(12+third)/12),base*Math.pow(2,19/12)];
   const bar=cycle((t+offset)/4.5);
   const phrase=shape(cycle((t+offset)/18),.035,.07);
   const syllable=shape(cycle(bar*2),.1,.18);
   const bloom=(.68+.32*syllable)*(.52+.48*phrase)*(.82+.18*morph);
   for(let i=0;i<4;i++)set(all[i],parts[i],bloom*[.16,.13,.14,.13][i],i%2===0?3:0,1,false,.25);
   set(all[4],base,0);set(all[5],base,0);
  }else if(style==='sutra'){
   // Narrow-range, syllabic dokkyo-inspired chant; no actual sacred words.
   const syllable=.66+((seed>>>5)%7)*.036,clock=(t+(seed%7)*.09)/syllable;
   const step=Math.floor(clock),pattern=[0,0,0,0,-2,0,0,1,0,0,-1,0];
   const pitch=hz(45+(seed%5)+pattern[((step%12)+12)%12]);
   const stroke=shape(cycle(clock),.12,.22);
   const phrase=shape(cycle(clock/12),.035,.07);
   const level=stroke*phrase*(.80+.20*morph),cent=[0,-2,2.1,-1.7,1.6,.7];
   all.forEach((v,i)=>set(v,pitch*Math.pow(2,cent[i]/1200),level*[.19,.115,.095,.072,.045,.035][i],i%2?3:4,.77,false,.09));
  }else if(style==='cetacean'){
   // Lower long calls contain successive motifs: unit -> phrase -> repeated theme.
   const period=8+(seed%5)*.8,phase=cycle((t+(seed%11)*.15)/period);
   const lowContour=Math.sin(phase*2*Math.PI*1.4+.3)+.3*Math.sin(phase*2*Math.PI*3.1+(seed%13));
   const bass=95+(seed%8)*8;
   const tone=bass*Math.pow(2,(lowContour*4)/12);
   const lowLevel=shape(phase,.12,.20)*(.82+.18*morph);
   set(state.body,tone,lowLevel*.21,3,.54,false,.24);
   const reply=cycle(phase+.39);
   set(state.pulse,tone*1.31*(1+.08*Math.sin(reply*2*Math.PI)),shape(reply,.13,.22)*.12,4,.70,false,.18);
   // Repeat stable individual FM contours, not independent random noise each tick.
   for(let i=0;i<4;i++){
    const rate=2.9+(seed%4)*.29,ph=cycle((t+(seed%31)*.04)/rate+i*.245);
    const variation=Math.sin(ph*Math.PI*2*(1.1+((seed>>>i)&3)*.07)+i*.63);
    const rise=.6*Math.sin(ph*Math.PI*2)+(i%2?-.24:.24)*Math.sin(ph*Math.PI*4.4);
    const f=clamp(1120+(seed%170)+i*170+variation*350+rise*310,670,2600);
    const call=ph<.58?shape(ph/.58,.16,.20):0;
    const glow=clamp(blink(i*.31),0,1.6);
    set(state.lights[i],f,call*(.125+i*.014)*(.70+.30*glow),2,1,true,.07);
   }
  }
 }
 window.MorphVoiceStyles={INFO,current,apply};
})();
