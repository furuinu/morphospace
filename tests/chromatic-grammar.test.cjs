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

test('low and high detail share the developmental coordinate frame and pigment field',()=>{
 const result=run(`(()=>{
  const g=makeFounderGenome(731029,0,4),a=pickPalette(g.seed,g.colorDNA,g.patternDNA),b=pickPalette(g.seed,g.colorDNA,g.patternDNA);
  const low=makeSpecimen(g.seed,g.style,a,true,null,.7,.84,.75,0,null,copyJSON(g));
  const high=makeSpecimen(g.seed,g.style,b,false,null,.7,.84,.75,0,null,copyJSON(g));
  const points=[[0,0,0],[.5,.2,-.1],[-.2,.75,.35]];
  return {frames:JSON.stringify([a.chromaticFrame.origin,a.chromaticFrame.axis,a.chromaticFrame.extent])===JSON.stringify([b.chromaticFrame.origin,b.chromaticFrame.axis,b.chromaticFrame.extent]),
   colors:points.every(p=>JSON.stringify(chromaticBaseColor(a,p))===JSON.stringify(chromaticBaseColor(b,p))),
   low:low.shell.tri.length,high:high.shell.tri.length};
 })()`);
 assert.equal(result.frames,true);assert.equal(result.colors,true);assert.ok(result.high>result.low);
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

test('camera position inverts the actual orbit/pan view transform',()=>{
 const error=run(`(()=>{
  let error=0;
  for(const yaw of [-2.1,0,.54,2.4])for(const pitch of [-1.1,-.18,.3,1.1]){
   const p=cameraWorldPosition(yaw,pitch,13,2,-3),m=mul4(translate(-13),mul4(rotX(-pitch),mul4(rotY(-yaw),translate3(-2,3,0))));
   for(let r=0;r<3;r++)error=Math.max(error,Math.abs(m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]));
  }
  return error;
 })()`);
 assert.ok(error<.00001,'reflections must use the camera that actually rendered the specimen');
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
