const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function rig(){const a=html.indexOf('const JOINT_LIMIT=');const src=html.slice(a,html.indexOf('const JOINT_QUAT=',a));
 const V={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),scale:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)}};
 const f={Math,Float32Array,V,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(f);vm.runInContext(src+';this.build=buildArticulation;this.step=stepJointBehaviour;',f);return f}
function specimen(){
 // Body at the origin, one stalk to a knob along +x, one spike along +y.
 const blobs=[{p:[0,0,0],axes:[.5,.5,.5],kind:'nucleus'},{p:[1.4,0,0],axes:[.3,.3,.3],kind:'bud'}];
 const links=[{a:[0,0,0],b:[1.4,0,0],radius:.1}],branches=[{a:[0,1.2,0],b:[0,0,0],r0:.04,r1:.08}];
 const pts=[];for(let x=-.5;x<=1.7;x+=.05)for(const y of [-.08,0,.08])pts.push([x,y,0]);for(let y=0;y<=1.2;y+=.05)pts.push([0,y,0]);
 const data=new Float32Array(pts.length*17);pts.forEach((p,i)=>data.set(p,i*17));
 return {sp:{seed:42,localGroup:{source:{blobs,links,structures:{branches}},copyTransforms:[{},{}]}},mesh:{data},pts};
}
test('joints sit at the roots of arms and spikes and skin blends smoothly across each root',()=>{
 const f=rig(),{sp,mesh,pts}=specimen(),r=f.build(sp,mesh);
 assert.equal(r.joints.length,2);
 const arm=r.joints.find(j=>j.kind==='arm'),spike=r.joints.find(j=>j.kind==='spike');
 assert.ok(arm.pivot[0]>.3&&arm.pivot[0]<.5,'arm pivot near the body surface: '+arm.pivot);
 assert.equal(arm.behaviour,'scan','a long arm ending in a knob scans like an eye stalk');
 assert.ok(spike.pivot[1]>.3&&spike.pivot[1]<.5);
 const w=x=>{const i=pts.findIndex(p=>Math.abs(p[0]-x)<1e-6&&p[1]===0&&p[2]===0);return [r.attr[i*3],r.attr[i*3+1]]};
 assert.equal(w(-.4)[0],-1,'body stays still');assert.equal(w(1.5)[1],1,'knob moves fully');
 const ramp=[.25,.3,.35,.4,.45,.5,.55,.6].map(x=>w(x)[1]);
 for(let i=1;i<ramp.length;i++)assert.ok(ramp[i]>=ramp[i-1]-1e-9,'weight rises monotonically across the root');
 assert.ok(ramp[0]<.2&&ramp.at(-1)>.8);
});
test('every behaviour stays within its angle bounds, so the shape never tears',()=>{
 const f=rig(),limits={scan:.43,twitch:.17,sway:.17,beat:.31,probe:.47,flinch:.40,wave:.13,drift:.23,breathe:.15,undulate:.18,wander:.22,echo:.24,unison:.21,chorus:.18};
 for(const behaviour of Object.keys(limits)){
  const st={};let worst=0;
  for(let t=0;t<40;t+=1/60){const [a,b]=f.step({behaviour,depth:1,rootSeed:5,groupSeed:9},st,t,1);worst=Math.max(worst,Math.hypot(a,b));}
  assert.ok(worst<=limits[behaviour],behaviour+' '+worst);assert.ok(worst>.02,behaviour+' moves');
 }
});
test('scan is saccadic: quick turns between holds',()=>{
 const f=rig(),st={};let prev=null,fast=0,still=0;
 for(let t=0;t<30;t+=1/60){const v=f.step({behaviour:'scan'},st,t,0);if(prev){const d=Math.hypot(v[0]-prev[0],v[1]-prev[1])*60;if(d>1)fast++;else if(d<.6)still++;}prev=v;}
 assert.ok(fast>20&&still>fast*4,'fast '+fast+' still '+still);
});
test('both vertex shaders articulate before every other motion and copies get their own states',()=>{
 assert.equal((html.match(/void main\(\)\{\n vec3 jPos=aPos,jNormal=aNormal;articulate\(jPos,jNormal\);/g)||[]).length,2);
 assert.doesNotMatch(html,/uCamerjPos/);
 assert.match(html,/applyJointUniforms\(rig,copyIndex,environmentTime,/);
 assert.match(html,/const states=rig\.states\[copyIndex\]\|\|\(rig\.states\[copyIndex\]=/);
 assert.match(html,/else\{gl\.disableVertexAttribArray\(v\.aJoint\);const c=mesh\.jointConst&&mesh\.jointRig===currentJointRig\?mesh\.jointConst:null;gl\.vertexAttrib3f\(v\.aJoint,c\?c\.j:-1,c\?c\.w:0,c\?c\.parent:-1\);\}/);
});

test('linked and recursive motions: unison joints share a pose, echo repeats the parent later and smaller',()=>{
 const f=rig();
 const a=f.step({behaviour:'unison',rootSeed:3},{},7.3,1),b=f.step({behaviour:'unison',rootSeed:3},{},7.3,5);
 assert.deepEqual(a,b,'unison: same tree, same pose');
 const parent=f.step({behaviour:'echo',depth:0,rootSeed:3},{},5,0),child=f.step({behaviour:'echo',depth:1,rootSeed:3},{},5.35,1);
 assert.ok(Math.abs(child[0]-parent[0]*.82)<1e-9&&Math.abs(child[1]-parent[1]*.82)<1e-9,'echo: child repeats the parent 0.35 s later at 82%');
});
test('a tip follows every ancestor: chains are composed root to tip and caps ride along',()=>{
 const a=html.indexOf('function jointQuatMul');const src=html.slice(a,html.indexOf('function applyJointUniforms',a));
 const V={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),scale:(a,s)=>a.map(v=>v*s),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
 const f={V,Array,Float32Array,Math};vm.createContext(f);vm.runInContext(src+';this.compose=composeJointChain;this.apply=jointQuatApply;',f);
 const qz=ang=>[0,0,Math.sin(ang/2),Math.cos(ang/2)],I=[0,0,0,1];
 const joints=[{pivot:[0,0,0],parent:-1},{pivot:[1,0,0],parent:0},{pivot:[2,0,0],parent:1}];
 const Q=new Float32Array(12),T=new Float32Array(12);
 // Only the root bends 90 degrees; the grandchild's tip at (3,0,0) must swing to (0,3,0).
 [qz(Math.PI/2),I,I].forEach((q,k)=>f.compose(joints[k],k,q,Q,T));
 const world=(k,p)=>f.apply(Array.from(Q.subarray(k*4,k*4+4)),p).map((v,i)=>v+T[k*4+i]);
 const tip=world(2,[3,0,0]);assert.ok(Math.hypot(tip[0],tip[1]-3,tip[2])<1e-5,'tip '+tip);
 // Each level adds its own bend on top.
 [qz(Math.PI/2),qz(Math.PI/2),I].forEach((q,k)=>f.compose(joints[k],k,q,Q,T));
 const tip2=world(2,[3,0,0]);assert.ok(Math.hypot(tip2[0]+2,tip2[1]-1,tip2[2])<1e-5,'tip2 '+tip2);
 // Shader uses the composed transform directly and no longer stacks only one parent.
 assert.match(html,/vec3 jointPoint\(int j,vec3 p\)\{return uJointPivot\[j\]\.xyz\+jointQuatRotate\(uJointQuat\[j\],p\);\}/);
 const r=rig(),{sp,mesh,pts}=specimen(),built=r.build(sp,mesh);
 const i=pts.length;const data=new Float32Array((i+1)*17);data.set(mesh.data);data.set([0,1.25,0],i*17);
 const b2=r.build(sp,{data});assert.ok(b2.attr[i*3+1]>.99,'the rounded cap just past the spike end moves with it');
 assert.ok(built.joints.length>0);
});
test('tentacle roots and collars ride on the branch they grow from',()=>{
 assert.match(html,/const root=restWorld\(p\.anchor\)/);
 assert.match(html,/const axis=V\.norm\(V\.sub\(restWorld\(V\.add\(p\.anchor,p\.growthDirection\)\),root\)\)/);
 assert.match(html,/const restDir=V\.norm\(V\.sub\(restWorld\(p\.rest\[j\]\),restWorld\(p\.rest\[j-1\]\)\)\)/);
 assert.match(html,/currentJointRig=rig;if\(rig\)for\(const pt of meshes\.localParts\|\|\[\]\)partJointConst\(pt\.mesh,rig\)/);
 const r=rig(),{sp,mesh}=specimen(),b=r.build(sp,mesh);
 const knob=b.locate([1.5,0,0]),body=b.locate([-.4,0,0]);
 assert.ok(knob&&knob.w===1,'a root on the knob follows its arm fully');assert.equal(body,null,'a root on the body stays put');
});
