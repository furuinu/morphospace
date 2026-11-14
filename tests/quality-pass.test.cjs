const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};

// ---- adaptive quality ---------------------------------------------------------------------------
function controller(){
 const context={Math,Number,clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};vm.createContext(context);vm.runInContext(between('const QUALITY_TIERS=','function frame(now){'),context);
 const run=code=>vm.runInContext(code,context);
 // Feed `seconds` of frames at the given interval; jitter makes intervals irregular.
 const feed=(interval,seconds,{ratio=3,eligible=true,jitter=0}={})=>{let t=0,k=0;while(t<seconds){const dt=interval*(1+jitter*Math.sin(k++*2.4));run(`stepAdaptiveQuality(${dt},${eligible},${ratio})`);t+=dt;}return run('quality.tier');};
 return {run,feed};
}
test('a device with headroom climbs to the higher render scale only where the display can show it',()=>{
 for(const [ratio,expected] of [[3,3],[2,3],[1.25,2],[1,2]]){
  const {feed,run}=controller();
  assert.equal(run('quality.tier'),2,'starts at the long-standing default');
  assert.equal(feed(1/60,3,{ratio}),2,'not before sustained evidence');
  assert.equal(feed(1/60,12,{ratio}),expected,'pixel ratio '+ratio);
 }
 const {run}=controller();
 assert.deepEqual(JSON.parse(run('JSON.stringify(QUALITY_TIERS)')),[{scale:1.2,contact:false},{scale:1.35,contact:false},{scale:1.35,contact:true},{scale:2,contact:true}]);
});
test('dropped frames shed load step by step, and a failed tier is not retried at once',()=>{
 const {feed,run}=controller();
 feed(1/60,12);assert.equal(run('quality.tier'),3);
 assert.equal(feed(.028,1.2,{jitter:.2}),3,'one slow second is not enough');
 assert.equal(feed(.028,3.2,{jitter:.2}),2,'steps down once sustained');
 assert.equal(feed(1/60,15),2,'the failed tier stays off limits for its penalty time');
 assert.equal(feed(1/60,20),3,'and is tried again later');
 feed(.028,3.2,{jitter:.2});assert.equal(run('quality.tier'),2);
 assert.equal(feed(1/60,30),2,'the penalty doubles after a second failure');
 // A heavy, irregular load keeps shedding: contact shading first, then resolution.
 const heavy=controller();
 assert.equal(heavy.feed(.045,5,{jitter:.3}),1);assert.equal(heavy.run('qualityTier().contact'),false);assert.equal(heavy.run('qualityTier().scale'),1.35);
 assert.equal(heavy.feed(.045,30,{jitter:.3}),0);assert.equal(heavy.run('qualityTier().scale'),1.2,'the lowest tier is only mildly softer');
});
test('a display capped at 30 Hz is recognised and does not cost quality',()=>{
 const {feed,run}=controller();
 feed(1/30,40);
 assert.equal(run('quality.capped'),true,'still pinned at the lowest tier: a cap, not load');
 assert.equal(run('quality.tier'),2,'back at the default');
 assert.equal(feed(1/30,30),2,'and it stays there while capped');
 feed(1/60,3);assert.equal(run('quality.capped'),false,'the cap lifting is noticed');
});
test('transitions, captures and one-off stalls are not measured',()=>{
 const {feed,run}=controller();
 assert.equal(feed(.05,30,{eligible:false,jitter:.3}),2);
 run('quality.hold=0');
 for(let i=0;i<40;i++){run('stepAdaptiveQuality(.05,true,3)');run('stepAdaptiveQuality(.4,true,3)');}
 assert.equal(run('quality.tier'),2,'a stall resets the window before it completes');
 assert.ok(html.includes("stepAdaptiveQuality(elapsed,selected>=0&&!viewer.morph&&!nanoAction&&!videoRecording&&!captureShareIsOpen&&!stockDialog.open&&!(typeof document!=='undefined'&&document.hidden)"));
 assert.ok(html.includes('const renderScale=Math.min(devicePixelRatio||1,recordHeight||videoRecording||nanoAction?1.35:qualityTier().scale);'),'recordings and captures keep a fixed scale');
 assert.ok(html.includes("nanoRenderPose||!qualityTier().contact||videoRecording?.lite>=1)return;"));
});

// ---- pattern filtering --------------------------------------------------------------------------
test('sub-pixel comb beads ease to their average coverage instead of aliasing',()=>{
 const frag=between('const frag=`','const frag300=');
 assert.ok(frag.startsWith('const frag=`#ifdef GL_OES_standard_derivatives\n#extension GL_OES_standard_derivatives : enable\n#endif\nprecision mediump float;'),'the extension directive precedes all code');
 assert.ok(frag.includes('#define PATTERN_FOOTPRINT(x) 0.0'),'no derivatives: unfiltered, never an error');
 assert.ok(frag.includes('rowShape=mix(rowShape,.39,rowBlur);')&&frag.includes('beadShape=mix(beadShape,.44,beadBlur);'));
 // The constants are the true means of the two shapes over one period.
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)},mean=(a,b)=>{let s=0;const n=20000;for(let i=0;i<n;i++)s+=1-smooth(a,b,Math.abs((i+.5)/n-.5));return s/n};
 assert.ok(Math.abs(mean(.10,.29)-.39)<.005,'row '+mean(.10,.29));
 assert.ok(Math.abs(mean(.12,.32)-.44)<.005,'bead '+mean(.12,.32));
 assert.ok(html.includes("if(!isWebGL2&&!compatibility)gl.getExtension('OES_standard_derivatives');"));
 const compatible=between('const compatibleFrag=','function initGL(');
 assert.ok(!compatible.includes('PATTERN_FOOTPRINT')&&!compatible.includes('fwidth'),'compatibility shader is untouched');
});

// ---- surrounding medium -------------------------------------------------------------------------
test('the body takes its medium colour from a small render of the sky behind it',()=>{
 const frag=between('const frag=`','const frag300=');
 assert.ok(frag.includes('if(uAirView.z>.5)air=texture2D(uSkyProbe,gl_FragCoord.xy*uAirView.xy).rgb;'));
 assert.ok(frag.includes('float away=(1.0/gl_FragCoord.w-uAirDepth.x)/max(uAirDepth.y,.001);'),'depth relative to the body centre');
 assert.ok(frag.includes('float haze=smoothstep(-.15,1.05,away)*.14*airStrength;'),'at most a seventh of the far side is replaced');
 assert.ok(frag.indexOf('if(airStrength>.001){')>frag.indexOf('shaded.rgb=clamp(shaded.rgb+scatteredLight,0.0,1.0);'));
 const probe=between('const SKY_PROBE_SIZE=','function drawStudioGL(');
 assert.ok(probe.includes('skyProbePass=true;')&&probe.includes('try{drawStudioGL(undefined,projection,view,false);}finally{skyProbePass=false;}'));
 assert.ok(probe.includes('gl.bindFramebuffer(gl.FRAMEBUFFER,target);gl.viewport(0,0,w,h);'),'the scene target is restored');
 assert.ok(html.includes("if(!skyProbePass&&(backgroundCycle.to.id==='nebula'||viewer.morph?.warpChase)&&renderer.residentProgram&&residentStars.length){"),'point stars are left out of the probe');
 assert.ok(html.includes("if(!(thumbSize>0))drawSkyProbe(pr,cam,lens?lens.targets[0].framebuffer:null,w,h);"));
 assert.ok(html.includes('gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,probe.texture);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(uniforms.uSkyProbe,3);'));
});
test('the fallback medium colour is bounded and thumbnails keep the plain look',()=>{
 const context={Math,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),spec:{viewDistance:8,growthModel:{bound:3}},suspension:{live:true},sky:null,currentBackgroundProfile(){return context.sky}};
 vm.createContext(context);vm.runInContext(between('function airPerspective(){','function setStudioLighting('),context);
 for(const sky of [{center:[.47,.4,.59],mid:[.23,.19,.42]},{center:[.01,.01,.02],mid:[0,0,.01]},{center:[1,1,1],mid:[1,1,1]}]){
  context.sky=sky;const air=vm.runInContext('airPerspective()',context);
  for(const v of air.tint)assert.ok(v>=0&&v<=1);
  assert.ok(Math.max(...air.tint)<=.75,'never dominant');
  assert.equal(air.depth,8);assert.equal(air.radius,3);assert.equal(air.strength,1);
 }
 context.suspension.live=false;assert.equal(vm.runInContext('airPerspective().strength',context),0);
});

// ---- progressive open ---------------------------------------------------------------------------
function opener({worker=true}={}){
 const log=[],workers=[];
 class FakeWorker{constructor(){this.terminated=false;workers.push(this)}postMessage(message){this.message=message}terminate(){this.terminated=true}}
 const context={console:{warn(){}},Number,Error,URL:{createObjectURL:()=>'blob:worker'},Blob:class{},Worker:worker?FakeWorker:undefined,VIEWER_CORE_SOURCE:'core',viewerWorkerURL:null,viewerWorkerSource:()=>'',
  MICRO_DENSITY:.75,$:id=>({value:'70',set textContent(v){log.push(['text',id,v])}}),copyJSON:x=>JSON.parse(JSON.stringify(x)),ensureEmissionDNA(){},pickPalette:()=>({}),
  genomes:[{style:1,archetype:0},{style:2,archetype:1}],seeds:[101,202],detailSpecimens:[null,null],detailCacheOrder:[],activeStoredIndividual:null,
  makeSpecimen:(seed,style,palette,low)=>{log.push(['make',seed,low]);return {seed,low,proxy:true}},
  createSpecimenForIndex:i=>{log.push(['full',i]);return {seed:context.seeds[i],full:true}},
  viewer:{morph:null},nanoAction:null,nanoOperationBusy:false,captureShareIsOpen:false,videoRecording:null,gl:{},renderer:{},meshes:{id:'old'},rigMeshes:['rig'],spec:null,
  upload:(gl,mesh)=>({...mesh,uploaded:true}),buildEmissionSites:()=>['site'],retireViewerMeshes:(m,r)=>log.push(['retire',m.id]),viewerMetadata:()=>log.push(['meta']),
  applyUploadedSpecimen:(next,preserve,meta,prepared)=>{log.push(['apply',next.seed,preserve,meta,!!prepared]);context.spec=next;if(prepared)context.meshes=prepared.meshes}};
 vm.createContext(context);vm.runInContext(between('let detailUpgrade=null;','// Stable per-individual transparency'),context);
 const run=code=>vm.runInContext(code,context);
 const payload=seed=>({ok:true,payload:{target:{seed,detailed:true},distance:6.5,targetMeshes:{shell:{id:'shell'},parts:[{kind:'opaque',mesh:{id:'part'}}],cilia:[{id:'cilia'}],localShell:{id:'local'},localParts:[{kind:'opaque',copyIndex:0,mesh:{id:'lp'}}]}}});
 return {context,log,workers,run,payload};
}
test('opening shows a light proxy at once and swaps in the Worker-built body',()=>{
 const {context,log,workers,run,payload}=opener();
 const proxy=run('openSpecimenProgressively(1)');
 assert.deepEqual(log,[['make',202,true]],'only the low lattice is built on the main thread');
 assert.equal(workers.length,1);assert.deepEqual(JSON.parse(JSON.stringify(workers[0].message)),{record:{seed:202,genome:{style:2,archetype:1}},settings:{variance:.7,density:.7,micro:.75}});
 context.spec=proxy;
 assert.equal(run('adoptDetailUpgrade()'),false,'nothing to adopt until the Worker answers');
 workers[0].onmessage({data:payload(202)});
 assert.ok(workers[0].terminated);
 assert.equal(run('adoptDetailUpgrade()'),true);
 assert.deepEqual(log.slice(1),[['apply',202,true,true,true],['retire','old'],['meta']],'framing is preserved and the proxy buffers are retired');
 assert.equal(context.spec.detailed,true);assert.equal(context.spec.baseViewDistance,6.5);assert.deepEqual(Array.from(context.spec.emissionSites),['site']);
 assert.ok(context.meshes.shell.uploaded&&context.meshes.parts[0].mesh.uploaded&&context.meshes.cilia[0].uploaded&&context.meshes.localShell.uploaded&&context.meshes.localParts[0].mesh.uploaded);
 assert.equal(context.meshes.localParts[0].copyIndex,0);
 assert.equal(context.detailSpecimens[1],context.spec,'the full body is cached for the next open');
 assert.equal(run('adoptDetailUpgrade()'),false);
});
test('a cached body, a missing Worker or a superseded open never leaves a proxy behind',()=>{
 const cached=opener();cached.context.detailSpecimens[0]={seed:101,full:true};
 assert.equal(cached.run('openSpecimenProgressively(0)').full,true);assert.equal(cached.workers.length,0);
 const none=opener({worker:false});
 assert.equal(none.run('openSpecimenProgressively(0)').full,true);assert.deepEqual(none.log,[['full',0]]);
 // Opening another specimen cancels the first build.
 const {context,workers,run,payload,log}=opener();
 run('openSpecimenProgressively(0)');context.spec=run('openSpecimenProgressively(1)');
 assert.ok(workers[0].terminated&&!workers[1].terminated);
 workers[0].onmessage({data:payload(101)});
 assert.equal(run('adoptDetailUpgrade()'),false,'a late answer for the cancelled open is ignored');
 // The viewer moved on to a different specimen: the answer is dropped.
 workers[1].onmessage({data:payload(202)});context.spec={seed:999};
 assert.equal(run('adoptDetailUpgrade()'),false);assert.equal(run('detailUpgrade'),null);
 assert.ok(!log.some(entry=>entry[0]==='apply'));
});
test('the swap waits for handoffs and captures, and a failed build falls back to the main thread',()=>{
 const {context,workers,run,payload,log}=opener();
 const proxy=context.spec=run('openSpecimenProgressively(0)');workers[0].onmessage({data:payload(101)});
 for(const busy of ["viewer.morph={source:spec}","nanoAction={}","nanoOperationBusy=true","captureShareIsOpen=true","videoRecording={}"]){
  run(busy);assert.equal(run('adoptDetailUpgrade()'),false,busy);assert.notEqual(run('detailUpgrade'),null,'kept for later: '+busy);
  run("viewer.morph=null;nanoAction=null;nanoOperationBusy=false;captureShareIsOpen=false;videoRecording=null");
 }
 assert.equal(run('adoptDetailUpgrade()'),true);assert.equal(context.spec.detailed,true);
 const failing=opener();failing.context.spec=failing.run('openSpecimenProgressively(1)');
 failing.workers[0].onmessage({data:{ok:false,message:'boom'}});
 assert.equal(failing.run('adoptDetailUpgrade()'),true);
 assert.deepEqual(failing.log.slice(1),[['full',1],['apply',202,true,true,false],['meta']]);
 assert.ok(html.includes('applyUploadedSpecimen(openSpecimenProgressively(i),false,true);'));
 assert.ok(html.includes('function close(){if(videoRecording||nanoAction)return;if(selected>=0)viewerLast={index:selected,stored:activeStoredIndividual};cancelDetailUpgrade();'));
 assert.ok(html.includes(' if(selected>=0)adoptDetailUpgrade();'));
});
test('a fixed quality overrides the automatic choice and 自動 hands control back',()=>{
 const {feed,run}=controller();
 run("setQualityPreference('3')");
 assert.equal(run('quality.tier'),3);assert.equal(run('qualityStatusText()'),'固定：高精細（描画倍率 2倍まで）');
 assert.equal(feed(.06,40,{jitter:.3}),3,'a fixed tier is never shed, however slow the frames');
 run("setQualityPreference('0')");assert.equal(feed(1/60,40),0,'nor raised');
 assert.equal(run('qualityStatusText()'),'固定：軽量（描画倍率 1.2倍まで）');
 run("setQualityPreference('auto')");
 assert.equal(run('quality.manual'),null);assert.equal(run('quality.tier'),2);assert.equal(run('qualityStatusText()'),'自動：標準（描画倍率 1.35倍まで）');
 assert.equal(feed(1/60,12),3,'automatic adjustment resumes, with past penalties cleared');
 for(const bad of ['x','','NaN'])assert.doesNotThrow(()=>run("setQualityPreference('"+bad+"')"));
 assert.ok(html.includes('<select id="renderQuality" aria-label="描画品質"><option value="auto" selected>自動（端末に合わせる）</option><option value="3">高精細</option><option value="2">標準</option><option value="1">陰影なし</option><option value="0">軽量</option></select>'));
 assert.ok(html.includes("if(['auto','0','1','2','3'].includes(value)){$('renderQuality').value=value;setQualityPreference(value)}"));
 assert.ok(html.includes("if($('qualityState'))$('qualityState').textContent=qualityStatusText();"));
});
