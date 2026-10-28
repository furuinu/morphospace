// Browser/WebGL smoke test: exercises the real shader compiler and gallery -> observation route.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const indexSource=require('node:fs').readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const backgroundParameters=[
 "float broadGlow=exp(-19.0*radius*radius);",
 "float coreGlow=exp(-85.0*radius*radius);",
 "vec2 p=(vStudioUv-uBgSceneCenter+vec2(0.0,.01))*uBgSceneScale;",
 "colour=screenColours(colour,uBgMid*(broadGlow*shimmer));",
 "colour=screenColours(colour,uBgCenter*min(1.0,coreGlow*",
 "if(uGalleryPreview>.5){",
 "float shimmer=.94+.06*cloudNoise(",
 "ctx.scale(w,h);",
 "float spin=t*.085;",
 "float bend=(wander-.5)*.24;",
 "float strength=.70+.60*wander;",
 "function drawStudioGL(rayStrength=.03575,projection=null,view=null,preview=false){"

];
for(const parameter of backgroundParameters)if(!indexSource.includes(parameter))
 throw Error('Spatial atmospheric layers must match the expected GPU shader: '+parameter);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1120,height:780},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push('pageerror: '+err.message));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href,{waitUntil:'domcontentloaded'});
  await page.locator('#gallery button.item').first().waitFor({state:'visible',timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#gallery button.item')&&!document.querySelector('#generate')?.disabled,{timeout:120000});
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
  await page.waitForFunction(()=>document.querySelector('#overlay')?.classList.contains('open'),{timeout:45000});
  await page.waitForTimeout(1200);
  const observation=await page.evaluate(()=>({
   opened:document.querySelector('#overlay').classList.contains('open'),
   alert:document.querySelector('#sceneAlert')?.hidden,
   width:document.querySelector('#glview')?.width,
   height:document.querySelector('#glview')?.height
  }));
  if(!observation.opened||!observation.alert||!observation.width||!observation.height)
   throw new Error('Observation failed: '+JSON.stringify(observation));
  // Production audio regression: this page must run only the original voice.
  // The five experimental styles are archived as a separate JS source.
  await page.locator('#viewerSettings summary').click({force:true});
  await page.evaluate(async()=>{
   if(document.querySelector('#viewerVoiceStyle'))throw Error('Experimental voice selector still present in production');
   if(window.MorphVoiceStyles)throw Error('Experimental voice generator still loaded in production');
   if(!bioticAudioRunning())await startBioticAudio();
  });
  await page.waitForFunction(()=>bioticAudioRunning(),{timeout:8000});
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
   if($('viewerBackground').value!=='deepsea'||$('viewerBackgroundInterval').value!=='60'||!$('viewerBackgroundRandom').checked)
    throw Error('Background defaults must be deepsea / 60s / random');
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
   const saved={from:backgroundCycle.from,to:backgroundCycle.to,fade:backgroundCycle.fade,fadeSeconds:backgroundCycle.fadeSeconds,at:environmentTime,distance:spec.viewDistance,panX,panY};
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
    for(const preset of BACKGROUND_PRESETS){
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
    // GPU zoom test: radial light grows and shrinks at the organism's camera depth.
     backgroundCycle.from=backgroundCycle.to=BACKGROUND_PRESETS[0];
     environmentTime=0;
     const defaultDistance=spec.viewDistance;
     drawStudioGL();const baseLight=luminance(at(.21));
     spec.viewDistance=defaultDistance*.55;drawStudioGL();const nearLight=luminance(at(.21));
     spec.viewDistance=defaultDistance*1.5;drawStudioGL();const farLight=luminance(at(.21));
     spec.viewDistance=defaultDistance;
     if(!(nearLight>baseLight+5&&baseLight>farLight+5))
      throw Error('Projected light does not zoom alongside the organism: '+[nearLight,baseLight,farLight]);
     const projection=persp(Math.PI*43/180,w/h,.1,Math.max(100,spec.viewDistance*2.4));
     const origin=backgroundSceneTransform(projection,viewerCameraMatrix());
     panX+=Math.max(2,(spec.baseViewDistance||20)*.18);
     const shifted=backgroundSceneTransform(projection,viewerCameraMatrix());
     panX=saved.panX;
     if(Math.abs(shifted.center[0]-origin.center[0])<.025)
      throw Error('Atmospheric origin should track the world-space specimen during pan');
     // Check cloud deformation independently of the colour-changing preset timer.
    backgroundCycle.from=backgroundCycle.to=BACKGROUND_PRESETS[2];
    const positions=[.025,.05,.08,.11,.14,.16,.18,.20,.23,.28,.30];
    environmentTime=0;drawStudioGL();
    const first=positions.flatMap(r=>[at(r,0),at(r,1.3),at(r,2.7)]);
    environmentTime=235;drawStudioGL();
    const last=positions.flatMap(r=>[at(r,0),at(r,1.3),at(r,2.7)]);
    const cloudMotion=first.reduce((sum,p,i)=>sum+distance(p,last[i]),0);
    if(cloudMotion<6)throw Error('Atmospheric glow shimmer must evolve independently of background selection: '+cloudMotion);
    // Compare the real GPU output with and without ray contribution. Its very
    // low gain must be perceptible in aggregate, but never produce hard lines.
    // Comparing increments at two times isolates the rays from moving clouds.
    const locations=[];
    for(const radius of [.09,.15,.22,.30,.39])
     for(let k=0;k<12;k++)locations.push([radius,k*Math.PI/6]);
    const rayFrame=(time,gain)=>{
     environmentTime=time;drawStudioGL(gain);
     return locations.map(([radius,angle])=>at(radius,angle));
    };
    const increments=(lit,dark)=>lit.map((v,i)=>v.slice(0,3).map((c,j)=>c-dark[i][j]));
    const raysAt=time=>increments(rayFrame(time,.03575),rayFrame(time,0));
    // A camera revolution is approximately 74 seconds. Look for a moving
    // directional pattern and independent, smoothly evolving ray strengths.
    const initial=raysAt(32),midpoint=raysAt(69),later=raysAt(106);
    const nearby=raysAt(69.16);
    const values=initial.flat(),maxLift=Math.max(...values);
    const changed=initial.filter(v=>v.some(c=>c>0)).length;
    const difference=(a,b)=>a.reduce((sum,v,i)=>sum+v.reduce((n,c,k)=>n+Math.abs(c-b[i][k]),0),0);
    const evolution=difference(initial,midpoint)+difference(midpoint,later);
    const nearDelta=difference(midpoint,nearby);
    // Inspect the 12 angular positions on a middle-distance ring. Uneven
    // evolution means the rays have moved, rather than only fading together.
    const ring=frame=>frame.slice(24,36).map(rgb=>rgb[0]+rgb[1]+rgb[2]);
    const a=ring(initial),b=ring(midpoint),c=ring(later);
    const angularEvolution=a.reduce((sum,v,i)=>sum+Math.abs(v-b[i])+Math.abs(b[i]-c[i]),0);
    if(changed<3||maxLift<1)throw Error('Radial glimmer is not visibly contributing to the actual WebGL image');
    if(maxLift>7)throw Error('Radial glimmer exceeds the 45%-attenuated brightness budget: '+maxLift);
    if(evolution<8||angularEvolution<2)throw Error('Ray angle and strength pattern fails to evolve at camera-orbit speed: '+evolution+'/'+angularEvolution);
    if(nearDelta>25)throw Error('Radial glimmer makes abrupt rather than smooth changes: '+nearDelta);
    return {samples,cloudMotion:Math.round(cloudMotion),rays:{maxLift,changed,evolution,angularEvolution,nearDelta}};
   }finally{
    Object.assign(backgroundCycle,{from:saved.from,to:saved.to,fade:saved.fade,fadeSeconds:saved.fadeSeconds});
    environmentTime=saved.at;spec.viewDistance=saved.distance;panX=saved.panX;panY=saved.panY;
    render();
   }
  });
  if(errors.length)throw new Error('GPU background readback errors: '+errors.join('\n'));
  console.log('PASS: analytic world-space glows and static atlas background',backgroundPixels);
  // An atlas that prioritizes visible cards must never leave the first one blank
   // after the viewer is closed, even when its generation was deferred.
   await page.evaluate(()=>close());
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#gallery canvas.thumb');
    if(!canvas)return false;
    const pixel=canvas.getContext('2d').getImageData(90,90,1,1).data;
    return pixel[3]===255;
   },null,{timeout:60000});
   console.log('PASS: visible atlas thumbnail rendered after observation closes');
   console.log('PASS: real WebGL shaders compiled and observation mode opened',observation);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
