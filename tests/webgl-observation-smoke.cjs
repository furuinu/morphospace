// Browser/WebGL smoke test: exercises the real shader compiler and gallery -> observation route.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
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
   if(!equal(backgroundOptions,['deepsea','predawn','sunrise','twilight','nebula']))throw Error('Five atmospheric backgrounds missing');
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
  console.log('PASS: real WebGL shaders compiled and observation mode opened',observation);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
