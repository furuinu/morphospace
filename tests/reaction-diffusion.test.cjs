const test=require('node:test');
const assert=require('node:assert/strict');
const reaction=require('../surface-reaction.js');
test('Gray-Scott atlas is finite, deterministic and has four growth stages',()=>{
 const dna={family:9,freqA:3.2,freqB:5.4,phaseA:1.2,mottleBias:.7,bandMix:.43,linearity:.64};
 const first=reaction.createAtlas(61023,dna),again=reaction.createAtlas(61023,dna),other=reaction.createAtlas(61024,dna);
 assert.equal(first.width,112);
 assert.equal(first.height,112);
 assert.equal(first.pixels.length,112*112*4);
 assert.deepEqual(first.pixels,again.pixels);
 assert.notDeepEqual(first.pixels,other.pixels);
 assert.deepEqual(first.stages,[48,84,132,192]);
 const n=reaction.size,px=first.pixels,w=first.width,means=[],nonzero=[];
 for(let stage=0;stage<4;stage++){
  const x0=(stage%2)*n,y0=Math.floor(stage/2)*n;
  let sum=0,count=0;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=((y0+y)*w+x0+x)*4;
   sum+=px[i];if(px[i]>48)count++;
   assert.equal(px[i+3],255);
  }
  means.push(sum/(n*n));nonzero.push(count);
 }
 assert.ok(nonzero.every(n=>n>0),'reaction must survive every growth stage');
 assert.ok(new Set(means.map(x=>Math.round(x*100))).size>1,'growth stages must evolve rather than duplicate noise');
});
