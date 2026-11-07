// Browser/WebGL smoke test: exercises the real shader compiler and gallery -> observation route.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const indexSource=require('node:fs').readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const backgroundParameters=[
 "float broadGlow=exp(-19.0*radius*radius);",
 "float coreGlow=exp(-85.0*radius*radius);",
 "vec2 p=(vStudioUv-vec2(.5,.49))*1.0;",
 "colour=screenColours(colour,uBgMid*(broadGlow*shimmer));",
 "colour=screenColours(colour,uBgCenter*min(1.0,coreGlow*",
 "if(uGalleryPreview>.5){",
 "float shimmer=.94+.06*cloudNoise(",
 "ctx.scale(w,h);",
 "float t=0.0;",
 "float bend=(wander-.5)*.24;",
 "float strength=.70+.60*wander;",
 "function drawStudioGL(rayStrength=.03575,projection=null,view=null,preview=false){"

];
for(const parameter of backgroundParameters)if(!indexSource.includes(parameter))
 throw Error('Fixed infinite-distance marine background must match the GPU shader: '+parameter);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1120,height:780},deviceScaleFactor:1});
  // Stabilize the random boot collection in headless CI so regressions are reproducible.
  await page.addInitScript(()=>{let state=0x6d2b79f5;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};});
  const errors=[];
  page.on('pageerror',err=>errors.push('pageerror: '+err.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href,{waitUntil:'domcontentloaded'});
  // A fresh visit starts on a DNA assembly screen, never exposing the atlas.
  const bootState=await page.evaluate(()=>{
   const splash=document.querySelector('#bootSplash'),dna=splash.querySelector('#bootDnaCanvas');
   return {
    loading:document.body.classList.contains('boot-loading'),
    galleryVisibility:getComputedStyle(document.querySelector('.wrap')).visibility,
    overlayVisibility:getComputedStyle(document.querySelector('#overlay')).visibility,
    splashVisible:getComputedStyle(splash).visibility,
    dnaCanvas:dna instanceof HTMLCanvasElement,
    dnaContext:!!dna?.getContext('2d'),
    dnaComplete:typeof window.morphospaceBootDNAComplete==='function',
    titleTop:splash.querySelector('.boot-title').getBoundingClientRect().top,
    captionTop:splash.querySelector('.boot-caption').getBoundingClientRect().top
   };
  });
  if(bootState.galleryVisibility!=='hidden'||bootState.overlayVisibility!=='hidden'
    ||bootState.splashVisible!=='visible'||!bootState.dnaCanvas||!bootState.dnaContext||!bootState.dnaComplete)
   throw Error('The initial frame must show the spatial DNA canvas without revealing the atlas: '+JSON.stringify(bootState));
  // Fail with the actual browser exception instead of hiding a syntax error behind
  // a two-minute locator timeout. Collect startup state for rendering stalls.
  try{
   await page.waitForFunction(()=>document.querySelector('#gallery button.item')||
     window.__bootSmokeError,null,{timeout:60000});
  }catch(error){
   const state=await page.evaluate(()=>({
    bootClass:document.body.className,
    stage:document.querySelector('#bootStatus')?.textContent,
    message:document.querySelector('#message')?.textContent,
    galleryCount:document.querySelectorAll('#gallery button.item').length
   }));
   throw Error('Gallery startup timeout: '+JSON.stringify(state)+'; browser errors: '+errors.join(' | ')+'; '+error.message);
  }
  if(errors.length)throw Error('Gallery startup JS errors: '+errors.join(' | '));
  await page.locator('#gallery button.item').first().waitFor({state:'attached',timeout:5000});
  await page.waitForFunction(()=>document.body.classList.contains('boot-ready')&&
    !document.querySelector('#bootStartButton')?.hidden,null,{timeout:120000});
  const beforeTap=await page.evaluate(()=>({
    atlasHidden:getComputedStyle(document.querySelector('.wrap')).visibility==='hidden',
    viewerHidden:getComputedStyle(document.querySelector('#overlay')).visibility==='hidden',
    dnaVisible:!document.querySelector('#bootSplash').classList.contains('boot-dismissed')
  }));
  if(!beforeTap.atlasHidden||!beforeTap.viewerHidden||!beforeTap.dnaVisible)
   throw Error('Startup must remain gated until user taps: '+JSON.stringify(beforeTap));
  // The progress-only loader must preserve typography and expose start action.
  const bootFinal=await page.evaluate(()=>{
   const splash=document.querySelector('#bootSplash');
   return {
    titleTop:splash.querySelector('.boot-title').getBoundingClientRect().top,
    captionTop:splash.querySelector('.boot-caption').getBoundingClientRect().top,
    spinnerHidden:getComputedStyle(splash.querySelector('#bootDnaCanvas')).display==='none',
    barVisible:getComputedStyle(splash.querySelector('.boot-progress')).display!=='none',
    buttonVisible:getComputedStyle(document.querySelector('#bootStartButton')).visibility
   };
  });
  if(Math.abs(bootFinal.titleTop-bootState.titleTop)>1.5||
    Math.abs(bootFinal.captionTop-bootState.captionTop)>1.5||
    !bootFinal.spinnerHidden||!bootFinal.barVisible||bootFinal.buttonVisible!=='visible')
   throw Error('Progress-only boot screen layout regression: '+JSON.stringify(bootFinal));
  await page.locator('#bootSplash').click({position:{x:24,y:24}});
  await page.waitForFunction(()=>!document.body.classList.contains('boot-ready')&&
    document.querySelector('#bootSplash')?.classList.contains('boot-dismissed'),null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#gallery button.item')&&!document.querySelector('#generate')?.disabled,null,{timeout:120000});
  const state=await page.evaluate(()=>({
   webgl:!!(document.querySelector('#glview')?.getContext('webgl2')||document.querySelector('#glview')?.getContext('webgl')),
   gpuError:document.querySelector('#gpuDiag')?.textContent,
   status:document.querySelector('#status')?.textContent
  }));
  if(!state.webgl)throw new Error('WebGL context unavailable in CI: '+JSON.stringify(state));
  if(errors.length)throw new Error('WebGL initialization errors: '+errors.join('\n'));
  // Trigger the gallery item's real click handler even when startup already opened the viewer.
  // Playwright's pointer click would be intercepted by the fullscreen WebGL canvas.
  await page.locator('#gallery button.item').first().evaluate(item=>item.click());
  await page.waitForFunction(()=>document.querySelector('#overlay')?.classList.contains('open'),null,{timeout:45000});
  await page.waitForTimeout(1200);
  const observation=await page.evaluate(()=>({
   opened:document.querySelector('#overlay').classList.contains('open'),
   alert:document.querySelector('#sceneAlert')?.hidden,
   width:document.querySelector('#glview')?.width,
   height:document.querySelector('#glview')?.height
  }));
  if(!observation.opened||!observation.alert||!observation.width||!observation.height)
   throw new Error('Observation failed: '+JSON.stringify(observation));
  // Match startup typography with the viewer and verify the title moves on navigation tap.
  const typography=await page.evaluate(()=>{
   const title=getComputedStyle(document.querySelector('#bootSplash .boot-title'));
   const viewerTitle=getComputedStyle(document.querySelector('#viewerTitleText'));
   const subtitle=getComputedStyle(document.querySelector('#bootSplash .boot-caption'));
   const viewerSubtitle=getComputedStyle(document.querySelector('#viewerSubtitleText'));
   const zoom=[...document.querySelector('.viewer-zoom').children].map(node=>node.id||node.className);
   return {
    sameTitle:title.fontSize===viewerTitle.fontSize&&title.fontWeight===viewerTitle.fontWeight&&title.letterSpacing===viewerTitle.letterSpacing,
    sameSubtitle:subtitle.fontSize===viewerSubtitle.fontSize&&subtitle.letterSpacing===viewerSubtitle.letterSpacing,
    zoom
   };
  });
  if(!typography.sameTitle||!typography.sameSubtitle||typography.zoom[0]!=='viewer-zoom-lens'||typography.zoom[1]!=='viewerZoomOut')
   throw Error('Loader typography or zoom icon ordering is wrong: '+JSON.stringify(typography));
  const titleBefore=await page.locator('.viewer-brand').evaluate(el=>parseFloat(getComputedStyle(el).top));
  // Verify the end position with CSS transitions disabled only in the test:
  // software-rendered WebGL can prevent animations advancing under headless CI.
  await page.evaluate(()=>{
   setViewerNavigationVisible(false);
   document.querySelector('.viewer-brand').style.setProperty('transition','none','important');
  });
  const titleAfter=await page.locator('.viewer-brand').evaluate(el=>parseFloat(getComputedStyle(el).top));
  if(!(titleAfter+30<titleBefore))throw Error('Title did not move to the top edge: '+JSON.stringify({titleBefore,titleAfter,navHidden:await page.locator('#overlay').evaluate(el=>el.classList.contains('viewer-nav-hidden')),inlineTop:await page.locator('.viewer-brand').evaluate(el=>el.style.top)}));
  await page.evaluate(()=>{
   document.querySelector('.viewer-brand').style.removeProperty('transition');
   setViewerNavigationVisible(true);
  });
  const settledBoot=await page.evaluate(()=>({
   splashHidden:document.querySelector('#bootSplash').classList.contains('boot-dismissed'),
   ariaHidden:document.querySelector('#bootSplash').getAttribute('aria-hidden'),
   atlasCount:document.querySelectorAll('#gallery button.item').length
  }));
  if(!settledBoot.splashHidden||settledBoot.ariaHidden!=='true'||settledBoot.atlasCount!==1)
   throw Error('The viewer must boot with exactly one on-demand specimen: '+JSON.stringify(settledBoot));
  // Production audio regression: this page must run only the original voice.
  // The five experimental styles are archived as a separate JS source.
  await page.locator('#viewerSettings > summary').click({force:true});
  await page.evaluate(async()=>{
   if(document.querySelector('#viewerVoiceStyle'))throw Error('Experimental voice selector still present in production');
   if(window.MorphVoiceStyles)throw Error('Experimental voice generator still loaded in production');
   if(!bioticAudioRunning())await startBioticAudio();
  });
  await page.waitForFunction(()=>bioticAudioRunning(),null,{timeout:8000});
  await page.waitForTimeout(750);
  const originalVoice=await page.evaluate(async()=>{
   tickBioticAudio();
   const voice=pureChoir.body;
   if(!voice||!voice.exciter)throw Error('Original choir is not initialized');
   if(voice.exciter.type!=='sawtooth')throw Error('Original glottal source was modified');
   if(voice.directTone||voice.directOvertone)throw Error('Experiment added direct-oscillator nodes');
   const analyser=bioticAudio.engine.waveform,samples=new Float32Array(analyser.fftSize);
   let energy=0,peak=0;
   for(let i=0;i<40;i++){
    analyser.getFloatTimeDomainData(samples);
    for(const sample of samples){energy+=sample*sample;peak=Math.max(peak,Math.abs(sample))}
    await new Promise(resolve=>setTimeout(resolve,45));
   }
   return{rms:Math.sqrt(energy/(40*samples.length)),peak,styleSelector:false,
    status:document.querySelector('#viewerSoundStatus').textContent};
  });
  if(originalVoice.rms<.00001)throw Error('Original choir produced no signal: '+JSON.stringify(originalVoice));
  if(errors.length)throw new Error('Original voice browser errors: '+errors.join('\n'));
  console.log('PASS: production original-only WebAudio engine, no archived experiment loaded',originalVoice);

  // The production material projection defaults to triplanar.
  const projection=page.locator('#triplanarTrial');
  if(!await projection.isChecked())throw new Error('Triplanar projection must be enabled by default');
  // The legacy mapping remains available for comparison and must compile too.
  await projection.evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForTimeout(450);
  if(errors.length)throw new Error('Legacy projection WebGL errors: '+errors.join('\n'));
  await projection.evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForTimeout(450);
  if(errors.length)throw new Error('Triplanar WebGL errors: '+errors.join('\n'));
  // Viewer and background clocks are separate. Exercise actual settings and timer behavior.
  const backgroundTest=await page.evaluate(()=>{
   const $=id=>document.getElementById(id);
   const choices=id=>Array.from($(id).options,option=>Number(option.value)||option.value);
   const viewerOptions=choices('viewerInterval').map(Number);
   const backgroundOptions=choices('viewerBackground').map(String);
   const cycleOptions=choices('viewerBackgroundInterval').map(Number);
   const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   if(!equal(viewerOptions,[0,10,20,30,60,90,120]))throw Error('Viewer interval options incorrect');
   if(!equal(backgroundOptions,['deepsea','predawn','sunrise','twilight','nebula','moonlit']))throw Error('Six atmospheric backgrounds missing');
   if(!equal(cycleOptions,[0,30,60,90,120,150,180]))throw Error('Background cycle options incorrect');
   if($('viewerBackground').value!=='nebula'||$('viewerBackgroundInterval').value!=='0'||$('viewerBackgroundRandom').checked)
    throw Error('Background defaults must be nebula / no cycle / random OFF');
   const change=(id,value)=>{
    const el=$(id);
    if(el.type==='checkbox')el.checked=value;else el.value=String(value);
    el.dispatchEvent(new Event('change',{bubbles:true}));
   };
   change('viewerInterval',0);
   change('viewerBackground','sunrise');
   const start=currentBackgroundProfile().center.slice();
   tickBackgroundCycle(.2);
   const intermediate=currentBackgroundProfile().center.slice();
   if(equal(start,intermediate))throw Error('Background must interpolate instead of instantly switching');
   if(viewer.seconds!==0)throw Error('Organism auto-advance not stopped');
   change('viewerBackgroundRandom',true);
   change('viewerBackgroundInterval',30);
   const before=backgroundCycle.to.id;
   backgroundCycle.elapsed=29.96;
   tickBackgroundCycle(.2);
   const after=backgroundCycle.to.id;
   if(before===after||viewer.seconds!==0)throw Error('Background cycle must advance independently of organism');
   change('viewerBackgroundRandom',false);
   change('viewerBackground','predawn');
   const held=backgroundCycle.to.id;
   backgroundCycle.elapsed=29.96;
   tickBackgroundCycle(.2);
   if(backgroundCycle.to.id!==held)throw Error('Background random OFF should keep selected atmosphere');
   change('viewerBackgroundRandom',true);
   change('viewerBackgroundInterval',0);
   const stopped=backgroundCycle.to.id;
   backgroundCycle.elapsed=500;
   tickBackgroundCycle(.2);
   if(backgroundCycle.to.id!==stopped)throw Error('Background cycle なし should stop transitions');
   change('viewerBackgroundInterval',60);
   change('viewerBackground','deepsea');
   change('viewerInterval',30);
   return {viewerOptions,backgroundOptions,cycleOptions,from:before,to:after,held};
  });
  await page.waitForTimeout(300);
  if(errors.length)throw new Error('Background WebGL or UI errors: '+errors.join('\n'));
  console.log('PASS: independent background controls, preset transitions and real GPU shader',backgroundTest);
  // Read back the actual GPU background, not just preset metadata.
  // Isolating the studio pass lets the test assess atmospheric falloff even while
  // the specimen is moving or the lens effects are enabled.
  const backgroundPixels=await page.evaluate(()=>{
   const saved={from:backgroundCycle.from,to:backgroundCycle.to,fromMode:backgroundCycle.fromMode,toMode:backgroundCycle.toMode,fade:backgroundCycle.fade,fadeSeconds:backgroundCycle.fadeSeconds,at:environmentTime,distance:spec.viewDistance,panX,panY};
   const samples=[];
   const sample=(x,y)=>{
    const pixel=new Uint8Array(4);
    gl.readPixels(Math.round(x),Math.round(y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    return Array.from(pixel);
   };
   const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
   const distance=(a,b)=>Math.hypot(...a.slice(0,3).map((v,k)=>v-b[k]));
   const w=canvas.width,h=canvas.height;
   // At neutral zoom the light retains the original softly feathered gradients.
   const at=(radius,angle=0)=>sample(w*(.50+radius*Math.cos(angle)),h*(.49+radius*Math.sin(angle)));
   try{
    // The radial atmospheric invariants apply only to the six natural presets.
    // The four psychedelic patterns are tested separately for GPU motion.
    backgroundCycle.fromMode=backgroundCycle.toMode=0;
    for(const preset of BACKGROUND_PRESETS.filter(p=>p.id!=='nebula'&&!backgroundMode(p.id))){
     backgroundCycle.from=backgroundCycle.to=preset;
     backgroundCycle.fade=0;
     backgroundCycle.fadeSeconds=0;
     environmentTime=0;
     gl.bindFramebuffer(gl.FRAMEBUFFER,null);
     gl.viewport(0,0,w,h);
     drawStudioGL();
     const central=at(0),middle=at(.21),edge=at(.48);
     if(gl.getError()!==gl.NO_ERROR)throw Error('GPU error reading background '+preset.id);
     if(luminance(central)<70||luminance(middle)<18||luminance(central)-luminance(middle)<20)
      throw Error('Background is too dark or has lost luminous middle layer: '+preset.id+' / '+central+' / '+middle+' / '+edge);
     if(luminance(middle)-luminance(edge)<8)
      throw Error('Screen-blended middle layer must brighten the opaque dark base: '+preset.id);
     if(distance(central,middle)<9)
      throw Error('The 40% luminous circle must fade softly into the middle layer: '+preset.id);
     if(central.some((v,i)=>i<3&&v<=0))
      throw Error('Atmosphere has clipped central color: '+preset.id);
     samples.push({id:preset.id,central,middle,edge});
    }
    for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
     const a=samples[i].central,b=samples[j].central;
     if(distance(a,b)<7)throw Error('Two atmosphere presets are visually indistinguishable: '+a+' / '+b);
    }
    // Procedural nebula is deliberately non-radial and evolves over time.
    // Test its actual GPU pixels separately from legacy atmospheric falloff.
    backgroundCycle.from=backgroundCycle.to=backgroundProfile('nebula');
    backgroundCycle.fade=backgroundCycle.fadeSeconds=0;
    const nebulaProbes=[];
    for(let yi=1;yi<=5;yi++)for(let xi=1;xi<=7;xi++)
     nebulaProbes.push([xi/8,yi/6]);
    const nebulaFrame=()=>nebulaProbes.map(([x,y])=>sample(w*x,h*y));
    environmentTime=0;drawStudioGL();const nebulaA=nebulaFrame();
    environmentTime=235;drawStudioGL();const nebulaB=nebulaFrame();
    if(gl.getError()!==gl.NO_ERROR)throw Error('Procedural nebula GPU rendering failed');
    const nebulaMax=Math.max(...nebulaA.map(luminance));
    const nebulaMotion=nebulaA.reduce((sum,p,i)=>sum+distance(p,nebulaB[i]),0);
    if(nebulaMax<15)throw Error('Procedural nebula is uniformly dark: '+nebulaMax);
    if(nebulaMotion<2)throw Error('Procedural nebula does not evolve over time: '+nebulaMotion);
    // The marine gradient is infinitely distant: time, zoom and camera pan do not move it.
    backgroundCycle.from=backgroundCycle.to=BACKGROUND_PRESETS[0];
    backgroundCycle.fromMode=backgroundCycle.toMode=0;
    backgroundCycle.fade=backgroundCycle.fadeSeconds=0;
    const probes=[[.11,0],[.21,.8],[.35,2.1],[.28,4.3],[.41,1.1],[.15,5.1]];
    environmentTime=0;drawStudioGL();
    const initial=probes.map(([r,a])=>at(r,a));
    environmentTime=235;drawStudioGL();
    const later=probes.map(([r,a])=>at(r,a));
    const sumDifference=(a,b)=>a.reduce((sum,p,i)=>sum+distance(p,b[i]),0);
    if(sumDifference(initial,later)>1)throw Error('Infinite-distance gradient changes with time');
    const originalDistance=spec.viewDistance;
    spec.viewDistance*=.55;drawStudioGL();
    const zoomed=probes.map(([r,a])=>at(r,a));
    spec.viewDistance=originalDistance;
    if(sumDifference(initial,zoomed)>1)throw Error('Infinite-distance gradient follows camera zoom');
    const originalPan=panX;panX+=Math.max(2,(spec.baseViewDistance||20)*.18);
    drawStudioGL();const panned=probes.map(([r,a])=>at(r,a));panX=originalPan;
    if(sumDifference(initial,panned)>1)throw Error('Infinite-distance gradient follows camera pan');
    const projection=persp(Math.PI*43/180,w/h,.1,Math.max(100,spec.viewDistance*2.4));
    const scene=backgroundSceneTransform(projection,viewerCameraMatrix());
    if(Math.abs(scene.center[0]-.5)>1e-6||Math.abs(scene.center[1]-.5)>1e-6||scene.scale!==1)
     throw Error('Infinite background coordinates must remain screen-fixed');
    drawStudioGL(0);const noRay=probes.map(([r,a])=>at(r,a));
    drawStudioGL(.03575);const withRay=probes.map(([r,a])=>at(r,a));
    const rayLift=sumDifference(noRay,withRay);
    if(gl.getError()!==gl.NO_ERROR)throw Error('Fixed marine background GPU rendering failed');
    return {samples,staticGradient:true,rayLift:Math.round(rayLift)};
   }finally{
    Object.assign(backgroundCycle,{from:saved.from,to:saved.to,fromMode:saved.fromMode,toMode:saved.toMode,fade:saved.fade,fadeSeconds:saved.fadeSeconds});
    environmentTime=saved.at;spec.viewDistance=saved.distance;panX=saved.panX;panY=saved.panY;
    render();
   }
  });
  if(errors.length)throw new Error('GPU background readback errors: '+errors.join('\n'));
  console.log('PASS: fixed infinite marine atmosphere and static atlas background',backgroundPixels);
  // An atlas that prioritizes visible cards must never leave the first one blank
   // after the viewer is closed, even when its generation was deferred.
   await page.evaluate(()=>close());
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#gallery canvas.thumb');
    if(!canvas)return false;
    const pixel=canvas.getContext('2d').getImageData(90,90,1,1).data;
    return pixel[3]===255;
   },null,{timeout:60000});
   console.log('PASS: rotating DNA start gate, user-initiated observation and visible atlas thumbnail');
   console.log('PASS: real WebGL shaders compiled and observation mode opened',observation);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
