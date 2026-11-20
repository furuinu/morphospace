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
   (legacy?'':'|'+t.feed+'|'+t.kill+'|'+t.diffusionA+'|'+t.diffusionB+'|'+t.anisotropy+'|'+t.axis+'|'+t.seedSpots+'|'+t.seedRadius));
  const r=random(key),len=N*N;
  let a=new Float32Array(len),b=new Float32Array(len),nextA=new Float32Array(len),nextB=new Float32Array(len);
  a.fill(1);
  const seedCount=legacy?8+Math.floor(r()*9):Math.max(2,Math.round(t.seedSpots)),spots=[];
  const spotR=legacy?null:Math.max(.8,Number(t.seedRadius)||2.4);
  for(let i=0;i<seedCount;i++)spots.push({x:r()*N,y:r()*N,r:legacy?1.6+r()*3.4:spotR*(.7+.6*r()),oval:.7+r()*.65});
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   let seedField=0;
   for(const s of spots){const dx=Math.min(Math.abs(x-s.x),N-Math.abs(x-s.x)),dy=Math.min(Math.abs(y-s.y),N-Math.abs(y-s.y));if((dx*dx+dy*dy*s.oval)<s.r*s.r)seedField=1;}
   if(seedField){const i=y*N+x;b[i]=.68+.26*r();a[i]=.35+.18*r();}
  }
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
  const snapshots=[];
  const ix=(x,y)=>((y+N)%N)*N+((x+N)%N);
  for(let tick=1;tick<=TOTAL;tick++){
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const i=y*N+x,A=a[i],B=b[i],react=A*B*B;
    const lA=ox*(a[ix(x+1,y)]+a[ix(x-1,y)])+oy*(a[ix(x,y+1)]+a[ix(x,y-1)])+
             .05*(a[ix(x+1,y+1)]+a[ix(x+1,y-1)]+a[ix(x-1,y+1)]+a[ix(x-1,y-1)])-A*total;
    const lB=ox*(b[ix(x+1,y)]+b[ix(x-1,y)])+oy*(b[ix(x,y+1)]+b[ix(x,y-1)])+
             .05*(b[ix(x+1,y+1)]+b[ix(x+1,y-1)]+b[ix(x-1,y+1)]+b[ix(x-1,y-1)])-B*total;
    nextA[i]=clamp(A+(dA*lA-react+feed*(1-A)),0,1);
    nextB[i]=clamp(B+(dB*lB+react-(kill+feed)*B),0,1);
   }
   [a,nextA]=[nextA,a];[b,nextB]=[nextB,b];
   if(STAGES.includes(tick))snapshots.push(b.slice());
  }
  const atlas=new Uint8Array(N*N*4*4),size=N*2;
  for(let stage=0;stage<4;stage++){
   const field=snapshots[stage],tileX=(stage%2)*N,tileY=Math.floor(stage/2)*N;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const i=y*N+x,o=((tileY+y)*size+tileX+x)*4;
    const dx=field[ix(x+1,y)]-field[ix(x-1,y)],dy=field[ix(x,y+1)]-field[ix(x,y-1)];
    atlas[o]=Math.round(clamp(field[i]*3.8,0,1)*255);
    atlas[o+1]=Math.round(clamp(.5+dx*1.75,0,1)*255);
    atlas[o+2]=Math.round(clamp(.5+dy*1.75,0,1)*255);
    atlas[o+3]=255;
   }
  }
  return {width:size,height:size,pixels:atlas,stages:STAGES.slice(),seed:key};
 }
 return Object.freeze({createAtlas,size:N,stages:STAGES.slice()});
});
