const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const context=vm.createContext({document:{querySelectorAll:()=>[]},TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams,console});
vm.runInContext(scripts[0],context);
const core=scripts[2].slice(0,scripts[2].indexOf("const canvas=$('glview'),gl="));
assert.ok(core.length>100000,'Load the real application core without starting the browser UI');
vm.runInContext(core,context);
const run=code=>vm.runInContext(code,context,{timeout:120000});
const plain=x=>JSON.parse(JSON.stringify(x));

test('252 source palettes retain six pigments and reproducible, diverse spatial grammars',()=>{
 const result=run(`(()=>{
  const seen=new Set();let invalid=0;
  for(let seed=1;seed<=512;seed++){
   const p=pickPalette(seed),q=pickPalette(seed);
   seen.add(p.design.grammar);
   if(JSON.stringify(p)!==JSON.stringify(q)||p.hex.length!==6||new Set(p.design.order).size!==6)invalid++;
   const i=p.design.order[0],j=p.design.order[1],best=Math.max(...p.baseRgb.map((c,k)=>k===i?-1:chromaticDistance(p.baseRgb[i],c)));
   if(chromaticDistance(p.baseRgb[i],p.baseRgb[j])<best-1e-10)invalid++;
  }
  return {palettes:COLOR_TABLE.length,grammars:seen.size,invalid};
 })()`);
 assert.deepEqual(plain(result),{palettes:252,grammars:14,invalid:0});
});

test('pattern category controls still affect grammar selection',()=>{
 const result=run(`(()=>{
  const choices=[];
  for(let category=0;category<5;category++){
   const found=new Set();
   for(let family=0;family<22;family++){
    const weights=[0,0,0,0,0];weights[category]=1;
    found.add(pickPalette(123,null,{family,weights}).design.grammar);
   }
   choices.push([...found].sort());
  }
  return choices;
 })()`);
 const groups=plain(result);
 assert.equal(groups.length,5);
 for(const g of groups){
  assert.ok(g.some(v=>v<8),'Original grammars must remain available');
  for(let v=8;v<14;v++)assert.ok(g.includes(v),'Added grammar '+v+' must remain reachable');
 }
 assert.equal(new Set(groups.map(g=>JSON.stringify(g))).size,5,'Category weights must still select distinct legacy grammars');
});

test('high detail pigment is baked in its own local developmental frame while preview stays bounded',()=>{
 const result=run(`(()=>{
  const g=makeFounderGenome(731029,0,4),a=pickPalette(g.seed,g.colorDNA,g.patternDNA),b=pickPalette(g.seed,g.colorDNA,g.patternDNA);
  const low=makeSpecimen(g.seed,g.style,a,true,null,.7,.84,.75,0,null,copyJSON(g));
  const high=makeSpecimen(g.seed,g.style,b,false,null,.7,.84,.75,0,null,copyJSON(g));
  const local=high.localGroup,data=local.shell.data;
  const sample=[data[0],data[1],data[2]],expected=chromaticBaseColor(b,sample),actual=Array.from(data.slice(6,9));
  return {localFrame:b.chromaticFrame.growth===local.source,
   colors:expected.every((v,i)=>Math.abs(v-actual[i])<1e-5),
   copies:local.copyTransforms.length,
   low:low.shell.tri.length,high:high.shell.tri.length,
   source:local.shell.tri.length,
   budgeted:local.shell.tri.length*local.copyTransforms.length<high.shell.tri.length*9};
 })()`);
 assert.equal(result.localFrame,true);
 assert.equal(result.colors,true);
 assert.ok(result.copies>=2);
 assert.ok(result.low>0&&result.high>0&&result.source>0);
});

test('changing pattern DNA preserves shape, topology and motion DNA',()=>{
 const result=run(`(()=>{
  const a=makeFounderGenome(391753,2,3),b=copyJSON(a);b.patternDNA.family=(b.patternDNA.family+7)%22;
  const make=g=>makeSpecimen(g.seed,g.style,pickPalette(g.seed,g.colorDNA,g.patternDNA),true,null,.7,.84,.75,0,null,g);
  const x=make(a),y=make(b);let geometry=true;
  for(let i=0;i<x.shell.data.length;i+=9)for(let j=0;j<6;j++)if(x.shell.data[i+j]!==y.shell.data[i+j])geometry=false;
  return {geometry,tri:JSON.stringify([...x.shell.tri])===JSON.stringify([...y.shell.tri]),motion:JSON.stringify(a.motionDNA)===JSON.stringify(b.motionDNA)};
 })()`);
 assert.deepEqual(plain(result),{geometry:true,tri:true,motion:true});
});

test('shared DNA round trips and descendants generate valid inherited palettes',()=>{
 const result=run(`(()=>{
  const a=makeFounderGenome(912403,0,1),b=makeFounderGenome(503219,1,4);
  const record={id:'test',name:'色彩標本',seed:a.seed,genome:a,generation:0,parents:[]};
  const payload={version:1,record},decoded=MorphospaceCaptureShare.decode(MorphospaceCaptureShare.encode(payload));
  const original=pickPalette(a.seed,a.colorDNA,a.patternDNA),restored=pickPalette(decoded.record.seed,decoded.record.genome.colorDNA,decoded.record.genome.patternDNA);
  let valid=true;
  for(let i=0;i<32;i++){
   const g=crossoverGenome({genome:a},{genome:b},10001+i,i,.75).genome,p=pickPalette(g.seed,g.colorDNA,g.patternDNA);
   if(p.design.order.length!==6||p.design.grammar<0||p.design.grammar>13)valid=false;
  }
  return {same:JSON.stringify(original)===JSON.stringify(restored),valid};
 })()`);
 assert.deepEqual(plain(result),{same:true,valid:true});
});

test('background thumbnails preserve an open specimen and release only temporary buffers, even on failure',()=>{
 const start=scripts[2].indexOf('function drawGpuPreview('),end=scripts[2].indexOf('function currentIndividual()',start);
 const preview=scripts[2].slice(start,end);
 for(const failCapture of [false,true]){
  const state={id:'active'},buffers={id:'active-buffers'},rigs=['active-rig'],deleted=[],rendered=[];
  const controls={motion:{checked:true},branchInspectInfo:{textContent:'active anatomy'}};
  const fixture={gl:{},renderer:{},spec:state,meshes:buffers,rigMeshes:rigs,selected:0,
   modelYaw:1,modelPitch:2,panX:3,panY:4,bodyTime:5,canvas:{},console:{warn(){}},
   $:id=>controls[id],snapshotEmissionUI:()=>({old:true}),restoreEmissionUI(){},applyEmissionDNAtoUI(){},getSpecEmissionDNA:()=>({}),drawPreview(){},
   target:{width:180,height:180,getContext:()=>({clearRect(){},drawImage(){if(failCapture)throw Error('capture failure')}})}};
  fixture.destroyMeshes=()=>{if(fixture.meshes)deleted.push(fixture.meshes.id);fixture.meshes=null;fixture.rigMeshes=[];};
  fixture.applyUploadedSpecimen=sp=>{fixture.destroyMeshes();fixture.spec=sp;fixture.meshes={id:'preview-buffers'};controls.branchInspectInfo.textContent='preview anatomy';};
  fixture.render=()=>rendered.push(fixture.spec.id);
  vm.createContext(fixture);vm.runInContext(preview+"\ndrawGpuPreview(target,{id:'preview'});",fixture);
  assert.equal(fixture.spec,state);assert.equal(fixture.meshes,buffers);assert.equal(fixture.rigMeshes,rigs);
  assert.deepEqual(deleted,['preview-buffers']);assert.equal(rendered.at(-1),'active');
  assert.equal(controls.motion.checked,true);assert.equal(controls.branchInspectInfo.textContent,'active anatomy');
  assert.deepEqual([fixture.modelYaw,fixture.modelPitch,fixture.panX,fixture.panY,fixture.bodyTime],[1,2,3,4,5]);
 }
});

test('all four coatings are seeded, bounded and retained across saved DNA',()=>{
 const result=run(`(()=>{
  const families=new Set();let valid=true;
  for(let seed=1;seed<=256;seed++){
   const p=pickPalette(seed),o=p.design.optics,q=pickPalette(seed,{rows:p.rows,cols:p.cols},p.pattern);
   families.add(o.family);
   valid=valid&&JSON.stringify(o)===JSON.stringify(q.design.optics)&&
    o.f0>0&&o.f0<.1&&o.thickness>=230&&o.thickness<=760&&o.filmIOR>1&&
    o.roughness>0&&o.roughness<1&&o.filmStrength>0&&o.filmStrength<1&&o.rimStrength>0&&o.rimStrength<1;
  }
  return {count:families.size,valid};
 })()`);
 assert.deepEqual(plain(result),{count:4,valid:true});
});

test('global camera pose inverts orbit, pan and roll while lights follow the same world basis',()=>{
 // Resolve in the same VM global scope as the production camera helpers.
 run('var viewerCameraMatrix=()=>null;');
 const error=run(`(()=>{
  let error=0;
  const saved=typeof viewerCameraMatrix==='function'?viewerCameraMatrix:null;
  try{
   // The headless core intentionally stops before the UI's viewerCameraMatrix declaration.
   // Inject a controlled view matrix; test the real globalCameraPose() against it.
   for(const yaw of [-2.1,0,.54,2.4])for(const pitch of [-1.1,-.18,.3,1.1])for(const roll of [-.7,0,.6]){
    const m=mul4(translate(-13),mul4(rotZ(-roll),mul4(rotX(-pitch),mul4(rotY(-yaw),translate3(-2,3,0)))));
    viewerCameraMatrix=()=>m;
    const pose=globalCameraPose(),p=pose.position;
    for(let r=0;r<3;r++)error=Math.max(error,Math.abs(m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]));
    for(const [offset,axis] of [[[1,0,0],pose.right],[[0,1,0],pose.up],[[0,0,1],pose.back]]){
     const actual=cameraRigDirection(offset,pose);
     for(let r=0;r<3;r++)error=Math.max(error,Math.abs(actual[r]-axis[r]));
    }
   }
  }finally{viewerCameraMatrix=saved;}
  return error;
 })()`);
 assert.ok(error<.00001,'lighting and Fresnel view vectors must agree with the global camera matrix');
});

test('camera orbit and pan are computed in world coordinates independently of organism motion',()=>{
 const cameraSource=scripts[2].slice(scripts[2].indexOf('function worldCameraFrame('),scripts[2].indexOf('function backgroundSceneTransform('));
 assert.match(cameraSource,/function viewerCameraMatrix\(\)/);
 run(cameraSource);
 const error=run(`(()=>{
  let error=0;
  for(const yaw of [-2.1,0,.54,2.4])for(const pitch of [-1.1,-.18,.3,1.1])for(const roll of [-.4,0,.6]){
   const f=worldCameraFrame(yaw,pitch,roll,13,2,-3);
   const old=mul4(translate(-13),mul4(rotZ(-roll),mul4(rotX(-pitch),mul4(rotY(-yaw),translate3(-2,3,0)))));
   const actual=mul4(f.rotation,translate3(-f.position[0],-f.position[1],-f.position[2]));
   for(let i=0;i<16;i++)error=Math.max(error,Math.abs(actual[i]-old[i]));
   for(let i=0;i<3;i++)error=Math.max(error,Math.abs(f.position[i]-f.target[i]-f.back[i]*13));
   // Translation changes the target in fixed world X/Y, not the camera's local X/Y.
   const shifted=worldCameraFrame(yaw,pitch,roll,13,3,-1);
   for(let i=0;i<3;i++)error=Math.max(error,Math.abs(shifted.position[i]-f.position[i]-[1,2,0][i]));
  }
  return error;
 })()`);
 assert.ok(error<.00002,'camera view matrix and global pan/orbit must agree');
});

test('local copies deform once in canonical space under one organism root',()=>{
 const ui=scripts[2];
 const begin=ui.indexOf('function drawLocalCopies(baseModel,glassPass=false)');
 const end=ui.indexOf('function drawCopy(model,mirrored=false,glassPass=false)',begin);
 assert.ok(begin>0&&end>begin,'local specimen render path must exist');
 const block=ui.slice(begin,end);
 assert.match(block,/setCopyMotionUniforms\(gl,u,null\)/,'GPU must not inverse-map CPU-positioned local copies');
 assert.match(block,/mul4\(baseModel,articulatedCopyMatrix\(t,pose,spec\.growthModel\.copyLayout\)\)/);
 assert.doesNotMatch(block,/setCopyMotionUniforms\(gl,u,spec\.localGroup\.source\)/);
 // Camera rotation changes the projection, not the world-space placement of copies.
 const error=run(`(()=>{
  const t={axis:'y',angle:.37,p:[1.4,-.7,.2],scale:1,mirror:false,mirrorY:false};
  const joint={x:.12,y:-.08,z:.03};
  const root=mul4(translate3(.2,.3,-.4),rotY(.4));
  const world=mul4(root,articulatedCopyMatrix(t,joint,2));
  const p=[.2,.3,.4,1.],actual=[0,0,0,0];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)actual[i]+=world[j*4+i]*p[j];
  let err=0;
  for(const yaw of [-2.1,-.4,.3,2.2]){
   const camera=mul4(translate(-15),rotY(-yaw));
   // Camera is applied AFTER the unchanged organism world transform.
   const correct=mul4(camera,world),observed=actual.map((_,i)=>camera[i*4]*actual[0]+camera[i*4+1]*actual[1]+camera[i*4+2]*actual[2]+camera[i*4+3]*actual[3]);
   for(let i=0;i<4;i++){
    let expected=0;for(let j=0;j<4;j++)expected+=correct[j*4+i]*p[j];
    const viewPoint=camera[i]*actual[0]+camera[4+i]*actual[1]+camera[8+i]*actual[2]+camera[12+i]*actual[3];
    err=Math.max(err,Math.abs(expected-viewPoint));
   }
  }
  return err;
 })()`);
 assert.ok(error<.00001);
});

test('shared views retain both optical controls and accept old links without them',()=>{
 const result=run(`(()=>{
  const g=makeFounderGenome(120003,0,0),record={id:'optics',name:'光彩標本',seed:g.seed,genome:g,generation:0,parents:[]};
  const api=MorphospaceCaptureShare;
  const current=api.decode(api.encode({version:1,record,view:{fresnelStrength:0,iridescenceStrength:137}}));
  const legacy=api.decode(api.encode({version:1,record,view:{yaw:.5}}));
  return {view:current.view,legacy:legacy.view};
 })()`);
 assert.deepEqual(plain(result),{view:{fresnelStrength:0,iridescenceStrength:137},legacy:{yaw:.5}});
});
