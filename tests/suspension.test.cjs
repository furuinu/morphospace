const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,a);return html.slice(i,j)};

// ---- centre lock -------------------------------------------------------------------------------
function follow({position=[0,0,0],morph=null}={}){
 const specimen={viewDistance:20},pulseTravel={specimen,position:position.slice(),velocity:[0,0,0],camera:[0,0,0]};
 const context={Math,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),cameraHandoffEase:x=>x*x*(3-2*x),spec:specimen,viewer:{morph},pulseTravel,
  canvas:{width:1120,height:720},modelYaw:0,modelPitch:0,cameraRoll:0,panX:0,panY:0,pulseTravelActive:()=>true,cameraOrbitAngularSpeed:()=>.08,
  worldCameraFrame:()=>({position:[0,0,20],right:[1,0,0],up:[0,1,0],back:[0,0,1]}),cameraViewEnvelope:()=>({halfWidth:10,halfHeight:8}),
  V:{dot:(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0)}};
 vm.createContext(context);vm.runInContext(between('const cameraCorrection=','function pulseCameraDistance()'),context);
 const offset=()=>[pulseTravel.position[0]-pulseTravel.camera[0],pulseTravel.position[1]-pulseTravel.camera[1]];
 return {context,pulseTravel,offset,step:(dt=.05)=>vm.runInContext(`stepPulseCameraFollow(${dt})`,context)};
}
test('a travelling organism is held at the exact screen centre, with no free-drift zone or lag',()=>{
 const {pulseTravel,offset,step}=follow();
 step();
 // Swim diagonally at a brisk, varying speed for 12 seconds.
 for(let i=0;i<240;i++){pulseTravel.position[0]+=.05*(1+Math.sin(i*.2));pulseTravel.position[1]-=.02;step();}
 assert.ok(pulseTravel.position[0]>10,'the organism really travelled');
 assert.ok(Math.abs(offset()[0])<1e-9&&Math.abs(offset()[1])<1e-9,'offset '+offset());
 // A small excursion that the old 10% free-drift zone (1 unit here) would have ignored is cancelled too.
 pulseTravel.position[0]+=.3;step();
 assert.ok(Math.abs(offset()[0])<1e-9);
});
test('engaging the lock eases an existing offset out instead of jumping',()=>{
 const {pulseTravel,offset,step}=follow({position:[.8,-.5,0]});
 step(.016);
 assert.ok(Math.abs(pulseTravel.camera[0])<.03&&Math.abs(pulseTravel.camera[1])<.03,'first frame barely moves: '+pulseTravel.camera);
 let previous=offset()[0];
 for(let i=0;i<40;i++){step(.05);const now=offset()[0];assert.ok(now<=previous+1e-12&&now>=0,'monotonic, no overshoot');previous=now;}
 for(let i=0;i<200;i++)step(.05);
 assert.deepEqual(offset(),[0,0]);
});
test('the handoff keeps its own guided follow and re-arms the lock afterwards',()=>{
 const morph={mode:'camera-pan',switched:true,travelDistance:10,cameraTravel:20,elapsed:4,duration:5,fromDistance:20,toDistance:20,travelAxis:[1,0,0]};
 const {context,pulseTravel,offset,step}=follow({position:[3,0,0],morph});
 step(.1);
 assert.ok(pulseTravel.camera[0]>0&&pulseTravel.camera[0]<.3,'speed-bounded handoff correction is unchanged');
 context.viewer.morph=null;
 const before=offset()[0];step(.016);
 assert.ok(before-offset()[0]<.1,'no jump when the handoff ends');
 for(let i=0;i<300;i++)step(.05);
 assert.ok(Math.abs(offset()[0])<1e-9);
});

// ---- buoyancy and camera drift -----------------------------------------------------------------
function suspensionRuntime(){
 const helpers=['function mul4(','function rotX(','function rotZ(','function translate3('].map(name=>{const i=html.indexOf(name);return html.slice(i,html.indexOf('\n',i))}).join('\n');
 const context={Math,Float32Array,nanoAction:null,isolatedSpecimenFrame:false,viewer:{morph:null},spec:{seed:4242,viewDistance:10},environmentTime:0,matchMedia:()=>({matches:false})};
 vm.createContext(context);vm.runInContext(helpers+'\n'+between('const suspension=','function viewerCameraMatrix(){'),context);
 return {context,run:code=>vm.runInContext(code,context)};
}
test('suspension eases in and out and is off for handoffs, captures and reduced motion',()=>{
 const {context,run}=suspensionRuntime();
 assert.equal(run('suspension.gain'),0);
 run('stepSuspension(.016)');const first=run('suspension.gain');assert.ok(first>0&&first<.03,'no abrupt start');
 run('for(let i=0;i<120;i++)stepSuspension(.1)');assert.ok(run('suspension.gain')>.99);
 for(const off of ["viewer.morph={mode:'camera-pan'}","nanoAction={}","isolatedSpecimenFrame=true","matchMedia=()=>({matches:true})"]){
  const fresh=suspensionRuntime();fresh.run(off);assert.equal(fresh.run('suspensionTarget()'),0,off);
 }
 context.viewer.morph={};run('stepSuspension(.1)');const falling=run('suspension.gain');assert.ok(falling<1&&falling>.85,'no abrupt stop');
 run('for(let i=0;i<200;i++)stepSuspension(.1)');assert.equal(run('suspension.gain'),0);
});
test('buoyancy is a small rigid motion about the body centre and leaves thumbnails untouched',()=>{
 const {run}=suspensionRuntime();
 const base='translate3(3,-2,5)';
 assert.deepEqual(Array.from(run(`bodyBuoyancy(${base})`)),Array.from(run(base)),'no motion before the gain rises');
 run('suspension.gain=1');
 let maxShift=0,maxTilt=0,moved=0;
 for(let t=0;t<400;t+=1.7){
  const m=Array.from(run(`environmentTime=${t};bodyBuoyancy(${base})`));
  const shift=Math.hypot(m[12]-3,m[13]+2,m[14]-5);maxShift=Math.max(maxShift,shift);if(shift>.02)moved++;
  // Rotation block stays orthonormal: the body is never scaled or sheared.
  for(let a=0;a<3;a++)for(let b=a;b<3;b++){const dot=m[a*4]*m[b*4]+m[a*4+1]*m[b*4+1]+m[a*4+2]*m[b*4+2];assert.ok(Math.abs(dot-(a===b?1:0))<1e-5);}
  maxTilt=Math.max(maxTilt,Math.acos(Math.min(1,(m[0]+m[5]+m[10]-1)/2)));
 }
 assert.ok(moved>150,'the body keeps moving');
 assert.ok(maxShift<10*.02,'heave and sway stay within 2% of the framing distance: '+maxShift);
 assert.ok(maxTilt>.01&&maxTilt<.06,'tilt stays below 3.5 degrees: '+maxTilt);
 run('suspension.live=false');
 assert.deepEqual(Array.from(run(`bodyBuoyancy(${base})`)),Array.from(run(base)));
 assert.equal(run('cameraDrift()'),null);
});
test('camera drift is bounded and runs on a different rhythm from the body',()=>{
 const {run}=suspensionRuntime();run('suspension.gain=1');
 let maxShift=0,maxTurn=0;const body=[],camera=[];
 for(let t=0;t<600;t+=.9){
  const d=run(`environmentTime=${t};JSON.stringify(cameraDrift())`),c=JSON.parse(d),m=Array.from(run('bodyBuoyancy(translate3(0,0,0))'));
  maxShift=Math.max(maxShift,Math.hypot(c.x,c.y));maxTurn=Math.max(maxTurn,Math.abs(c.yaw),Math.abs(c.pitch),Math.abs(c.roll));
  body.push(m[13]);camera.push(c.y);
 }
 assert.ok(maxShift>.05&&maxShift<10*.015,'shift '+maxShift);
 assert.ok(maxTurn<.008,'under half a degree: '+maxTurn);
 const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,mb=mean(body),mc=mean(camera);
 let sbc=0,sbb=0,scc=0;for(let i=0;i<body.length;i++){sbc+=(body[i]-mb)*(camera[i]-mc);sbb+=(body[i]-mb)**2;scc+=(camera[i]-mc)**2;}
 assert.ok(Math.abs(sbc/Math.sqrt(sbb*scc))<.35,'body heave and camera drift are not locked together');
 for(let t=0;t<200;t+=.37)assert.ok(Math.abs(run(`suspensionWave(${t},.52,.33,.83,1.1)`))<=1);
});

// ---- motes ------------------------------------------------------------------------------------
test('motes form a world-periodic field around the body and blur with distance from the focal plane',()=>{
 const vertex=between('const moteVertex=','const moteFragment=');
 assert.ok(vertex.includes('vec3 local=mod(world-uMoteAnchor+.5*uMoteBox,uMoteBox)-.5*uMoteBox;'));
 assert.ok(vertex.includes('abs(1.0/dist-1.0/uMoteFocus)'),'thin-lens blur circle');
 assert.ok(vertex.includes('gl_PointSize=clamp(size*mix(.2,1.0,uMoteGain),1.0,uMoteMaxSize);'),'motes shrink as they fade');
 assert.ok(vertex.includes('float near=smoothstep(.14,.32,dist/uMoteFocus);'),'nothing fills the lens');
 // CPU port of the wrap: a mote keeps its world position while the anchor travels, until it wraps.
 const wrap=(w,a,box)=>{const m=((w-a+.5*box)%box+box)%box-.5*box;return a+m};
 const box=19,world=3.7;let jumps=0,previous=wrap(world,0,box);
 for(let a=0;a<60;a+=.25){const now=wrap(world,a,box);if(Math.abs(now-previous)>1e-9){jumps++;assert.ok(Math.abs(Math.abs(now-previous)-box)<1e-9,'only whole-box wraps');}assert.ok(Math.abs(now-a)<=box/2+1e-9);previous=now;}
 assert.ok(jumps>=2&&jumps<=4);
});
test('the mote pass adds light only, keeps depth and the emission mask, and restores GL state',()=>{
 const pass=between('function drawSuspendedMotes(','const SUSPENSION_MOTE_BOX=');
 assert.ok(pass.includes('gl.depthMask(false);gl.colorMask(true,true,true,false);'));
 assert.ok(pass.includes('gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);'));
 const tail=pass.slice(pass.indexOf('gl.drawArrays('));
 for(const restore of ['gl.disable(gl.BLEND)','gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)','gl.colorMask(true,true,true,true)','gl.depthMask(true)','gl.disableVertexAttribArray(p.aMote)'])assert.ok(tail.includes(restore),restore);
 assert.ok(pass.includes('if(!renderer?.moteProgram||!renderer.moteCount||!(gain>.004)||!spec)return;'));
 assert.ok(html.includes("if(postEffects&&!hidden)drawSuspendedMotes(lastSceneViewProj,restingCentre,h);"));
 assert.ok(html.includes("console.warn('Suspended motes disabled; biological rendering continues',error);moteProgram=null;"));
 const render=between('function render(thumbSize=0','function drawSuspendedMotes(');
 assert.ok(render.includes('suspension.live=!(thumbSize>0);'));
 assert.ok(render.indexOf('const restingCentre=[base[12],base[13],base[14]];')<render.indexOf('base=bodyBuoyancy(base);'),'motes do not bob with the body');
});
test('motes fade out faster than the sway when a transition pulls away, and return at the normal pace',()=>{
 const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(html,/const moteTarget=suspensionTarget\(\),moteTau=moteTarget<moteFade\.gain\?\.30:1\.1;/);
 assert.match(html,/const gain=suspension\.live\?moteFade\.gain:0;/);
});
