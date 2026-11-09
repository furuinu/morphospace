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
 const a=html.indexOf('function ambientConsonantRate'),b=html.indexOf('const ambientSense={');
 assert.ok(a>0&&b>a);
 const sandbox={clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),soundMusicalProfile:()=>({root:57,scale:[0,2,4,5,7,9,11]})};
 vm.runInNewContext(html.slice(a,b)+'\nthis.quant=ambientConsonantRate;this.traits=ambientTraits;',sandbox);
 for(const f of [110,220,330,440,800,1200]){const rate=sandbox.quant(f,{seed:1268});assert.ok(rate===null||(rate>=.74&&rate<=1.34));}
 assert.equal(sandbox.quant(NaN,{seed:1268}),null);
 assert.equal(sandbox.traits({seed:1268}).reflex,sandbox.traits({seed:1268}).reflex);
});
