const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
test('ambient hearing defaults off and always releases permission tracks',()=>{
 assert.match(html,/id="viewerMic" type="checkbox"/);
 assert.match(html,/getUserMedia\(\{audio:/);
 assert.match(html,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(html,/function stopBioticAudio[\s\S]*?stopAmbientSense\(\);/);
 assert.match(html,/document\.hidden\)\{releaseBioticWakeLock\(\);stopAmbientSense/);
});
test('hearing adapts existing voice, chorus pulse, and movement',()=>{
 assert.match(html,/const ambient=ambientSense\.active\?ambientSense\.response\(sp\):null/);
 assert.match(html,/state\.grooveNote=\(seed\+ambientSense\.onsetSerial\)%4/);
 assert.match(html,/const response=ambientSense\.motionFactor\(spec\)/);
 assert.match(html,/node\.velocity=clamp\(node\.velocity\+ambientSense\.response/);
 assert.match(html,/out\.connect\(engine\.sampleInput\);out\.connect\(engine\.reverbInput\)/);
});
test('the environmental ear uses bounded pitch and inherited identity',()=>{
 const a=html.indexOf('function ambientEstimatePitch'),b=html.indexOf('const ambientSense={');
 assert.ok(a>0&&b>a);
 const sandbox={clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),soundMusicalProfile:()=>({root:57,scale:[0,2,4,5,7,9,11]})};
 vm.runInNewContext(html.slice(a,b)+'\nthis.quant=ambientConsonantRate;this.traits=ambientTraits;this.pitch=ambientEstimatePitch;',sandbox);
 for(const f of [110,220,330,440,800,1200]){const rate=sandbox.quant(f,{seed:1268});assert.ok(rate===null||(rate>=.74&&rate<=1.34));}
 assert.equal(sandbox.quant(NaN,{seed:1268}),null);
 const silence=new Float32Array(4096);
 for(const rate of [44100,48000])for(const hz of [110,130.81,164.81,196,220,261.63,329.63,392,440,523.25,659.25,783.99]){
  const wave=new Float32Array(4096);
  for(let i=0;i<wave.length;i++){
   const p=2*Math.PI*hz*i/rate;
   wave[i]=.3*Math.sin(p)+.12*Math.sin(2*p+.33)+.07*Math.sin(3*p+.8);
  }
  const found=sandbox.pitch(wave,rate);
  assert.ok(found!==null&&Math.abs(found-hz)/hz<.015,'fundamental at '+hz+' Hz / '+rate+' samples, got '+found);
 }
 assert.equal(sandbox.pitch(silence,48000),null);
 assert.equal(sandbox.traits({seed:1268}).reflex,sandbox.traits({seed:1268}).reflex);
});
