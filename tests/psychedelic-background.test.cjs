'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const html=readFileSync(join(__dirname,'..','index.html'),'utf8');

test('six marine gradient presets remain available after psychedelic removal',()=>{
 assert.doesNotMatch(html,/id="viewerBackgroundFamily"/);
 for(const id of ['deepsea','predawn','sunrise','twilight','nebula','moonlit']){
  assert.match(html,new RegExp('value="'+id+'"'));
 }
 for(const id of ['psyflow','psykaleido','psycell','psystripes']){
  assert.doesNotMatch(html,new RegExp('value="'+id+'"'));
 }
 assert.match(html,/const backgroundFamily=id=>'marine'/);
 assert.match(html,/const backgroundCycle=/);
 assert.match(html,/id="viewerBackgroundRandom"/);
});

test('removed psychedelic shaders and clocks are not restored',()=>{
 assert.doesNotMatch(html,/globalThis\.MorphospacePsyBackground/);
 assert.doesNotMatch(html,/psyScene\(/);
 assert.doesNotMatch(html,/uPsy[0-9]/);
 assert.doesNotMatch(html,/psychedelicTime/);
 assert.doesNotMatch(html,/viewerPsySpeed/);
 assert.match(html,/vec2 p=\(vStudioUv-vec2\(\.5,\.49\)\)\*1\.0;/);
 assert.match(html,/float t=0\.0;/);
});

test('background shader remains inline for the Pages dependency whitelist',()=>{
 assert.doesNotMatch(html,/<script[^>]*src="psychedelic-background\.js/);
 assert.match(html,/<script src="about-i18n\.js" defer><\/script>/);
});

test('wide-angle star field adds only a centre-biased peripheral layer',()=>{
 assert.match(html,/const RESIDENT_STAR_COUNT=240,RESIDENT_WIDE_STAR_COUNT=480;/);
 assert.match(html,/const RESIDENT_STAR_CAPACITY=RESIDENT_STAR_COUNT\+RESIDENT_WIDE_STAR_COUNT;/);
 assert.match(html,/gl\.bufferData\(gl\.ARRAY_BUFFER,720\*4\*4,gl\.DYNAMIC_DRAW\)/);
 assert.match(html,/uResidentWideFactor/);
 assert.match(html,/float wideStar=step\(239\.5,id\)/);
 assert.match(html,/gl\.drawArrays\(gl\.POINTS,0,residentStars\.length\)/);
 assert.match(html,/const fieldFov=wide\?112:warpCameraFovDegrees\(viewer\.morph\)/);
 assert.match(html,/weight=\.12\+\.88\*Math\.pow\(1-radius,1\.7\)/);
 assert.match(html,/const halfHeight=Math\.tan\(warpCameraFovDegrees\(viewer\.morph\)\*Math\.PI\/360\)/);
 assert.match(html,/float wideArea=mix\(1\.0,1\.65,uResidentWideFactor\)/);
});

test('extra wide stars sample more densely near centre than at the rim',()=>{
 const vm=require('node:vm');
 const start=html.indexOf('function skyStarDirection(outside=false,wide=false){');
 const end=html.indexOf('function seedResidentStars(){',start);
 assert.ok(start>=0&&end>start);
 let state=123456789;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const seededMath=Object.create(Math);seededMath.random=random;
 const runtime={Math:seededMath,canvas:{width:1600,height:900},
  modelYaw:0,modelPitch:0,cameraRoll:0,viewer:{morph:{}},
  warpCameraFovDegrees:()=>43,
  worldCameraFrame:()=>({right:[1,0,0],up:[0,1,0],back:[0,0,1]}),
  cameraSkyFlowDirection:()=>[1,0]};
 vm.createContext(runtime);
 vm.runInContext(html.slice(start,end),runtime);
 let centre=0,rim=0;
 for(let i=0;i<18000;i++){
  const v=runtime.skyStarDirection(false,true);
  const f=Math.tan(112*Math.PI/360),nx=v[0]/(-v[2]*f*(16/9)),ny=v[1]/(-v[2]*f);
  const d=Math.hypot(nx,ny);
  if(d<.45)centre++;
  if(d>=.95&&d<1.4)rim++;
 }
 // Normalize by annulus area before comparing relative stellar density.
 const nearDensity=centre/(.45**2);
 const outerDensity=rim/(1.4**2-.95**2);
 assert.ok(nearDensity>outerDensity*2,`centre ${centre} / rim ${rim}`);
});

test('stellar flare thinning preserves strong leaders and absorbs weak nearby light',()=>{
 const vm=require('node:vm');
 const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
 const start=src.indexOf('function starFlareDensityTargets(candidates,wideFactor){');
 const end=src.indexOf('const residentStarUniforms=',start);
 assert.ok(start>=0&&end>start);
 const ctx=vm.createContext({Map,Math});
 vm.runInContext(src.slice(start,end),ctx);
 const candidates=[
  {id:1,x:0,y:0,brightness:1,wide:false},
  {id:2,x:.012,y:.01,brightness:.25,wide:true},
  {id:3,x:.9,y:.9,brightness:.4,wide:true}];
 const normal=ctx.starFlareDensityTargets(candidates,0);
 assert.equal(normal.get(2).opacity,1);
 const wide=ctx.starFlareDensityTargets(candidates,1);
 assert.equal(wide.get(1).opacity,1);
 assert.ok(wide.get(2).opacity<.8);
 assert.ok(wide.get(1).boost>1);
 assert.equal(wide.get(3).opacity,1);
});
test('wide flare remains luminous when inside the returning normal FOV',()=>{
 assert.match(html,/const wideVisibility=extra\?\(normal\?1:wideActive/);
 assert.match(html,/if\(extra&&wideActive\)star\.wideSeen=Math\.max/);
 assert.doesNotMatch(html,/vResidentEnergy=raw\*3\.7\*mix\(1\.0,uResidentWideFactor,wideStar\)/);
 assert.match(html,/const contracting=wideFactor<previousWideLens-\.0001/);
 assert.match(html,/if\(contracting&&wideFactor<\.68\)/);
 assert.match(html,/const required=Math\.max\(0,Math\.min\(2,18-count\)\)/);
 assert.match(html,/star\.entryOpacity=0;star\.flareOpacity=0/);
 assert.match(html,/star\.entryOpacity=Math\.min\(1/);
});
