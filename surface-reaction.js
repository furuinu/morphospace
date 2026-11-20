/* MORPHOSPACE reaction-diffusion: deterministic four-stage Gray-Scott material atlas.
   Simulated once when a specimen is viewed; the shader only interpolates cached stages. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.MorphospaceReaction=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const N=56,STAGES=[48,84,132,192],TOTAL=STAGES[STAGES.length-1];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function seedNumber(value){
  let h=2166136261>>>0;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
 }
 function random(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
 function createAtlas(seed,pattern,turing){
  const dna=pattern||{},t=turing&&typeof turing==='object'?turing:null,legacy=!t||t.legacy;
  const key=seedNumber(String(seed)+'|'+(dna.family||0)+'|'+(dna.freqA||0)+'|'+(dna.freqB||0)+'|'+(dna.phaseA||0)+'|'+(dna.mottleBias||0)+
   (legacy?'':'|'+t.feed+'|'+t.kill+'|'+t.diffusionA+'|'+t.diffusionB+'|'+t.anisotropy+'|'+t.axis+'|'+t.seedSpots+'|'+t.seedRadius+
    '|'+t.scaleRatio+'|'+t.fineWeight+'|'+t.fineInside));
  const r=random(key),len=N*N;
  // Feed/kill vary with inherited pigment chromosome; each generated specimen
  // has a deterministic morphology without any additional mutable DNA.
  // Chemistry is inherited when the individual carries a reaction chromosome, and
  // falls back to the historical pigment-derived formula for older specimens.
  const family=(Math.abs(Number(dna.family)||0)%22)/21;
  const feed=legacy?.028+.011*family+.0035*(Number(dna.mottleBias)||0):Number(t.feed);
  const kill=legacy?.055+.006*(Number(dna.bandMix)||0)+.0015*(Number(dna.linearity)||0):Number(t.kill);
  const dA=legacy?.96:Number(t.diffusionA),dB=legacy?.48:Number(t.diffusionB);
  // Anisotropic diffusion: making one direction diffuse faster turns labyrinths
  // into stripes running across that direction. The stencil is renormalised so the
  // total weight stays 1 and the simulation remains stable at the same step size.
  const an=legacy?0:Math.max(0,Math.min(.55,Number(t.anisotropy)||0)),ang=legacy?0:Number(t.axis)||0;
  const cx=Math.cos(ang),cy=Math.sin(ang);
  const wx=1+an*(2*cx*cx-1),wy=1+an*(2*cy*cy-1),total=.2*2*wx+.2*2*wy+.05*4;
  const ox=.2*wx,oy=.2*wy;
  const ix=(x,y)=>((y+N)%N)*N+((x+N)%N);
  // One Gray-Scott run. Wavelength scales with the square root of diffusion, so the
  // same chemistry at dA/ratio^2 patterns at 1/ratio of the wavelength: a second,
  // finer Turing mode of the same family rather than a different chemistry.
  function simulate(rng,dAv,dBv,ticks,spotCount,spotRadius){
   const marks=STAGES.map(v=>Math.max(4,Math.round(v*ticks/TOTAL))),last=marks[marks.length-1];
   let a=new Float32Array(len),b=new Float32Array(len),nextA=new Float32Array(len),nextB=new Float32Array(len);
   a.fill(1);
   const spots=[];
   for(let i=0;i<spotCount;i++)spots.push({x:rng()*N,y:rng()*N,r:spotRadius(rng),oval:.7+rng()*.65});
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    let seedField=0;
    for(const s of spots){const dx=Math.min(Math.abs(x-s.x),N-Math.abs(x-s.x)),dy=Math.min(Math.abs(y-s.y),N-Math.abs(y-s.y));if((dx*dx+dy*dy*s.oval)<s.r*s.r)seedField=1;}
    if(seedField){const i=y*N+x;b[i]=.68+.26*rng();a[i]=.35+.18*rng();}
   }
   const out=[];
   for(let tick=1;tick<=last;tick++){
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
     const i=y*N+x,A=a[i],B=b[i],react=A*B*B;
     const lA=ox*(a[ix(x+1,y)]+a[ix(x-1,y)])+oy*(a[ix(x,y+1)]+a[ix(x,y-1)])+
              .05*(a[ix(x+1,y+1)]+a[ix(x+1,y-1)]+a[ix(x-1,y+1)]+a[ix(x-1,y-1)])-A*total;
     const lB=ox*(b[ix(x+1,y)]+b[ix(x-1,y)])+oy*(b[ix(x,y+1)]+b[ix(x,y-1)])+
              .05*(b[ix(x+1,y+1)]+b[ix(x+1,y-1)]+b[ix(x-1,y+1)]+b[ix(x-1,y-1)])-B*total;
     nextA[i]=clamp(A+(dAv*lA-react+feed*(1-A)),0,1);
     nextB[i]=clamp(B+(dBv*lB+react-(kill+feed)*B),0,1);
    }
    [a,nextA]=[nextA,a];[b,nextB]=[nextB,b];
    if(marks.includes(tick))out.push(b.slice());
   }
   return out;
  }
  const coarseCount=legacy?8+Math.floor(r()*9):Math.max(2,Math.round(t.seedSpots));
  const spotR=legacy?null:Math.max(.8,Number(t.seedRadius)||2.4);
  const coarseRadius=legacy?(rng=>1.6+rng()*3.4):(rng=>spotR*(.7+.6*rng()));
  const snapshots=simulate(r,dA,dB,TOTAL,coarseCount,coarseRadius);
  // Compound Turing pattern: the fine mode is placed relative to the coarse domains
  // rather than simply summed, so a large marking carries detail of another scale
  // inside or between its domains instead of the two washing each other out.
  const ratio=legacy?0:Math.max(1.2,Number(t.scaleRatio)||2);
  const fineWeight=legacy?0:Math.max(-1,Math.min(1,Number(t.fineWeight)||0));
  if(fineWeight!==0){
   const fr=random((key^0x9e3779b9)>>>0),k=1/(ratio*ratio);
   const fine=simulate(fr,dA*k,dB*k,64,Math.max(3,Math.round(coarseCount*ratio)),rng=>Math.max(.7,spotR/ratio)*(.7+.6*rng()));
   const inside=Math.max(0,Math.min(1,Number(t.fineInside)||0));
   for(let stage=0;stage<snapshots.length;stage++){
    const c=snapshots[stage],f=fine[stage];
    // Normalise both modes to comparable amplitude before mixing, so the ratio of
    // their raw concentrations cannot silently mute one of them.
    let cm=0,fm=0;
    for(let i=0;i<len;i++){if(c[i]>cm)cm=c[i];if(f[i]>fm)fm=f[i];}
    cm=Math.max(1e-4,cm);fm=Math.max(1e-4,fm);
    for(let i=0;i<len;i++){
     const cn=c[i]/cm,mask=inside*cn+(1-inside)*(1-cn);
     c[i]=Math.max(0,cn+fineWeight*(f[i]/fm)*(.25+.75*mask))*cm;
    }
   }
  }
  // Gray-Scott gives no control over how much of the field ends up pigmented: a
  // regime that patterns beautifully can still settle mostly below the shader's
  // threshold, which made some individuals render no marking at all. Each stage is
  // therefore requantised so that exactly the inherited fraction of the field sits
  // above the shader's pigment midpoint (.38 of smoothstep(.30,.46)). Earlier stages
  // get a smaller share of the target, so growth over the four stages is preserved.
  const STAGE_SHARE=[.45,.70,.90,1.];
  const quantile=(sorted,q)=>sorted[Math.max(0,Math.min(sorted.length-1,Math.round(q*(sorted.length-1))))];
  function requantise(field,target){
   const sorted=Float32Array.from(field).sort(),len=sorted.length;
   const thr=quantile(sorted,1-target);
   // Width of the transition around the threshold, measured from the field itself so
   // a soft field stays soft and a sharply separated one stays sharp.
   const hi=quantile(sorted,Math.min(.999,1-target*.70)),lo=quantile(sorted,Math.max(.001,1-Math.min(.98,target*1.45)));
   const w=Math.max(1e-5,(hi-lo)*.22);
   const out=new Float32Array(len);
   for(let i=0;i<len;i++)out[i]=clamp(.38+(field[i]-thr)/w*.26,0,1);
   return out;
  }
  const atlas=new Uint8Array(N*N*4*4),size=N*2;
  const target=legacy?0:clamp(Number(t.coverTarget)||.3,.04,.80);
  for(let stage=0;stage<4;stage++){
   const raw=snapshots[stage],tileX=(stage%2)*N,tileY=Math.floor(stage/2)*N;
   const field=legacy?raw:requantise(raw,Math.max(.02,target*STAGE_SHARE[stage]));
   // The historical encode scaled the raw concentration; a normalised field is already
   // in shader range, and its gradient is steeper, so it carries its own gain.
   const gain=legacy?1.75:.85,scale=legacy?3.8:1;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const i=y*N+x,o=((tileY+y)*size+tileX+x)*4;
    const dx=field[ix(x+1,y)]-field[ix(x-1,y)],dy=field[ix(x,y+1)]-field[ix(x,y-1)];
    atlas[o]=Math.round(clamp(field[i]*scale,0,1)*255);
    atlas[o+1]=Math.round(clamp(.5+dx*gain,0,1)*255);
    atlas[o+2]=Math.round(clamp(.5+dy*gain,0,1)*255);
    atlas[o+3]=255;
   }
  }
  return {width:size,height:size,pixels:atlas,stages:STAGES.slice(),seed:key};
 }
 return Object.freeze({createAtlas,size:N,stages:STAGES.slice()});
});
