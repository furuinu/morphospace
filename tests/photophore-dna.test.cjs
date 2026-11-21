const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const ctx=vm.createContext({console,document:{querySelectorAll:()=>[],getElementById:()=>({value:'100',checked:true})},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
vm.runInContext(scripts[0],ctx);vm.runInContext(scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl=")),ctx);
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));

test('founders always carry at least one organ system and stay in range',()=>{
 const list=plain(run(`Array.from({length:200},(_,i)=>photophoreFounderDNA(91000+i*17))`));
 const limits=plain(run('PHOTO_LIMITS'));
 let lateral=0,rows=0,red=0;
 for(const d of list){
  assert.ok(d.rows>0||d.lateral||d.scatter>=.08,'no organs');
  for(const [k,[lo,hi]]of Object.entries(limits))assert.ok(d[k]>=lo&&d[k]<=hi,`${k}=${d[k]}`);
  if(!d.head)assert.equal(d.redHead,0);
  lateral+=d.lateral;rows+=d.rows>0;red+=d.redHead;
 }
 assert.ok(lateral>60&&lateral<190&&rows>100,`variety ${lateral} ${rows}`);
 assert.ok(red<30,`far-red heads should be rare: ${red}`);
 // Blue-green dominates deep-sea emission.
 const mean=400+list.reduce((n,d)=>n+d.wavelength,0)/list.length;
 assert.ok(mean>470&&mean<500,`mean wavelength ${mean}`);
});

test('founders are deterministic and normalization is idempotent',()=>{
 const a=plain(run('photophoreFounderDNA(4242)')),b=plain(run('photophoreFounderDNA(4242)'));
 assert.deepEqual(a,b);
 assert.deepEqual(plain(run(`normalizedPhotophoreDNA(${JSON.stringify(a)},1)`)),a);
 // Retired or foreign data is replaced, not trusted.
 const g=plain(run(`(()=>{const g={photophoreDNA:{rows:99}};ensurePhotophoreDNA(g,4242);return g.photophoreDNA})()`));
 assert.deepEqual(g,a);
});

test('crossover segregates whole blocks, logs mutations and keeps an organ system',()=>{
 const out=plain(run(`(()=>{const res=[];for(let i=0;i<120;i++){const a={seed:10+i,photophoreDNA:photophoreFounderDNA(10+i)},b={seed:900+i,photophoreDNA:photophoreFounderDNA(900+i)};const log=[],inh={};const d=photophoreCrossoverDNA(a,b,5000+i,.3,log,inh);res.push({d,log,inh,A:a.photophoreDNA,B:b.photophoreDNA});}return res})()`));
 let mutated=0;
 for(const {d,log,inh,A,B} of out){
  assert.ok(d.rows>0||d.lateral||d.scatter>=.08);
  assert.equal(Object.keys(inh).filter(k=>k.startsWith('photophore_')).length,7);
  const src=inh.photophore_light==='A'?A:B;
  if(!log.some(x=>x.field==='photophoreDNA.wavelength'))assert.ok(Math.abs(d.wavelength-src.wavelength)<1e-3||(d.wavelength-A.wavelength)*(d.wavelength-B.wavelength)<=1e-6);
  mutated+=log.length>0;
 }
 assert.ok(mutated>20,`mutations ${mutated}`);
 // Children produced by the main crossover path inherit the chromosome.
 assert.match(html,/g\.photophoreDNA=photophoreCrossoverDNA\(a,b,seed,mutationStrength,mutationLog,inherited\)/);
});

test('flash code emits exactly n pulses per period then rests',()=>{
 const counts=plain(run(`(()=>{const out=[];for(const n of [1,2,3,5]){const d=.2,g=.3,P=n*(d+g)+1.5;let c=0,on=false;for(let t=0;t<P;t+=.002){const v=photophoreFlash(t,d,g,n,P);if(v>.5&&!on){c++;on=true}if(v<.1)on=false;}out.push(c);}return out})()`));
 assert.deepEqual(counts,[1,2,3,5]);
 assert.equal(run('photophoreFlash(3.9,.2,.3,2,4)'),0);
});

test('photophore DNA survives share encoding',()=>{
 const d=plain(run('photophoreFounderDNA(777)'));
 const back=plain(run(`(()=>{const g=makeFounderGenome(5,0,0);g.photophoreDNA=${JSON.stringify(d)};return MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode({version:1,record:{id:'p',name:'発光',seed:g.seed,style:g.style,genome:g,generation:0,parents:[]}})).record})()`));
 assert.deepEqual(back.genome.photophoreDNA,d);
});

test('wavelength maps to plausible light colours',()=>{
 const blue=plain(run('wavelengthRGB(460)')),green=plain(run('wavelengthRGB(520)')),red=plain(run('wavelengthRGB(680)'));
 assert.ok(blue[2]>blue[0]&&blue[2]>=blue[1]);
 assert.ok(green[1]>=green[0]&&green[1]>green[2]);
 assert.ok(red[0]>red[2]);
});

test('shader draws rule-placed photophores with pigment cups and morph endpoints',()=>{
 for(const part of ['float photoFlash(float t,float d,float g,float n,float P)','vec2 photoOrgan(','// Ventral rows','// Lateral line','// Scattered photophores','// Head searchlights','vec3(uNextChromaAxis.w,uNextChromaOrigin.w,uNextChromaScale.x)'])assert.ok(html.includes(part),part);
 assert.match(html,/function setEmissionUniforms\(v\)\{\n if\(!spec\|\|!v\)return;\n const values=photophoreUniformValues\(spec,true\);/);
 assert.match(html,/viewer\.morph\.fusePatternB\.set\(vars\['uNext'\+name\],pb\[name\]\)/);
});

test('touch startle genes are heritable and old chromosomes gain them from the seed',()=>{
 const list=plain(run(`Array.from({length:120},(_,i)=>photophoreFounderDNA(3000+i*29))`));
 const silent=list.filter(d=>d.startle===0).length;
 assert.ok(silent>8&&silent<50,`silent species ${silent}`);
 const old=plain(run(`(()=>{const d=photophoreFounderDNA(55);delete d.startle;delete d.startleDecay;delete d.startleSpeed;return normalizedPhotophoreDNA(d,55)})()`));
 assert.deepEqual(old,plain(run('photophoreFounderDNA(55)')));
 assert.ok(html.includes("photophore_startle")||html.includes("startle:['startle','startleDecay','startleSpeed']"));
 assert.match(html,/float photoStartleBoost\(vec3 p,vec4 st,vec4 st2\)/);
 assert.match(html,/triggerPhotoStartle\(e\.clientX,e\.clientY\)/);
});

test('organ systems vary internally: shape, elongation, clusters, fans and second lines',()=>{
 const list=plain(run(`Array.from({length:200},(_,i)=>photophoreFounderDNA(7000+i*31))`));
 const kinds=new Set(list.map(d=>d.shape));assert.equal(kinds.size,4);
 assert.ok(list.filter(d=>d.cluster>1).length>40);
 assert.ok(list.filter(d=>d.lateral2>0).length>50);
 assert.ok(list.filter(d=>d.elong>1.3).length>20);
 assert.match(html,/vec2 photoOrgan\(vec2 d,float s,float level,float ringDark,float shutter,vec2 sh\)/);
 assert.match(html,/PhotoShape:\[d\.shape,d\.elong,d\.sizeGrad,d\.cluster\]/);
});

test('light voices follow the photophore flash code on the shader clock',()=>{
 const r=plain(run(`(()=>{const d=Object.assign(photophoreFounderDNA(12),{lateral:1,lateral2:0,wave:0,pulse:.2,gap:.3,pulses:3,rest:1,scatter:0,startle:1,startleDecay:1});const P=photophorePeriod(d);let hits=0,on=false;for(let t=0;t<P;t+=.002){const v=photophoreVoiceValues(d,t)[0];if(v>.42&&!on){hits++;on=true}if(v<.1)on=false;}return {hits,startle:photophoreVoiceValues(d,0,{age:.5})[3],silent:photophoreVoiceValues(Object.assign({},d,{lateral:0}),.1)[0]}})()`));
 assert.equal(r.hits,3);assert.ok(r.startle>.4);assert.equal(r.silent,0);
 assert.match(html,/const photo=light\.photophore&&/);assert.match(html,/const lightValues=photo\?photophoreVoiceValues\(photo,photoClock,photoStartleState\)/);
});
