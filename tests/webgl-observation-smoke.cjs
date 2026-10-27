// Browser/WebGL smoke test: exercises the real shader compiler and gallery -> observation route.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const indexSource=require('node:fs').readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const backgroundParameters=[
 "float mid=driftingCloud(p-camera*.007,.425,",
 "float light=driftingCloud(p+camera*.011,.200,",
 "vec2 p=vStudioUv-vec2(.50,.49);",
 "colour=screenColours(colour,uBgMid*mid);",
 "colour=screenColours(colour,uBgCenter*light);",
 "cloud(profile.mid,.85);",
 "cloud(profile.center,.40);",
 "ctx.scale(w,h);"

];
for(const parameter of backgroundParameters)if(!indexSource.includes(parameter))
 throw Error('UV-size, full-strength Screen layers must match the agreed settings: '+parameter);
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
   const saved={from:backgroundCycle.from,to:backgroundCycle.to,fade:backgroundCycle.fade,fadeSeconds:backgroundCycle.fadeSeconds,at:environmentTime};
   const samples=[];
   const sample=(x,y)=>{
    const pixel=new Uint8Array(4);
    gl.readPixels(Math.round(x),Math.round(y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    return Array.from(pixel);
   };
   const luminance=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
   const distance=(a,b)=>Math.hypot(...a.slice(0,3).map((v,k)=>v-b[k]));
   const w=canvas.width,h=canvas.height;
   // Radius is measured in UVs: horizontal and vertical pixels scale separately.
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
    // Check cloud deformation independently of the colour-changing preset timer.
    backgroundCycle.from=backgroundCycle.to=BACKGROUND_PRESETS[2];
    const positions=[.025,.05,.08,.11,.14,.16,.18,.20,.23,.28,.30];
    environmentTime=0;drawStudioGL();
    const first=positions.flatMap(r=>[at(r,0),at(r,1.3),at(r,2.7)]);
    environmentTime=235;drawStudioGL();
    const last=positions.flatMap(r=>[at(r,0),at(r,1.3),at(r,2.7)]);
    const cloudMotion=first.reduce((sum,p,i)=>sum+distance(p,last[i]),0);
    if(cloudMotion<6)throw Error('Cloud layers must actually evolve over time independently of background selection: '+cloudMotion);
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
    const bare=rayFrame(32,0),glimmer=rayFrame(32,.065);
    const bareLater=rayFrame(285,0),glimmerLater=rayFrame(285,.065);
    const increments=(lit,dark)=>lit.map((v,i)=>v.slice(0,3).map((c,j)=>c-dark[i][j]));
    const initial=increments(glimmer,bare),later=increments(glimmerLater,bareLater);
    const values=initial.flat(),maxLift=Math.max(...values),changed=initial.filter(v=>v.some(c=>c>0)).length;
    const evolution=initial.reduce((sum,v,i)=>sum+v.reduce((n,c,k)=>n+Math.abs(c-later[i][k]),0),0);
    if(changed<3||maxLift<1)throw Error('Radial glimmer is not visibly contributing to the actual WebGL image');
    if(maxLift>12)throw Error('Radial glimmer is too conspicuous: peak channel increase '+maxLift);
    if(evolution<5)throw Error('Ray silhouettes remain fixed instead of gently evolving: '+evolution);
    return {samples,cloudMotion:Math.round(cloudMotion),rays:{maxLift,changed,evolution}};
   }finally{
    Object.assign(backgroundCycle,{from:saved.from,to:saved.to,fade:saved.fade,fadeSeconds:saved.fadeSeconds});
    environmentTime=saved.at;
    render();
   }
  });
  if(errors.length)throw new Error('GPU background readback errors: '+errors.join('\n'));
  console.log('PASS: UV cloud backgrounds and very faint time-varying radial glimmer',backgroundPixels);
  console.log('PASS: real WebGL shaders compiled and observation mode opened',observation);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
