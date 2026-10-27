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
  console.log('PASS: real WebGL shaders compiled and observation mode opened',observation);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
