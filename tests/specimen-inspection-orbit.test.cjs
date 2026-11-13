'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('const INSPECTION_SWEEP_RADIANS='),end=html.indexOf('const viewer={',begin);
assert.ok(begin>0&&end>begin,'independent specimen inspection controller is present');
const source=html.slice(begin,end);
const quatSource=['function specimenQuatMultiply(','function specimenQuatAxis(','function specimenQuatMatrix('].map(name=>{const a=html.indexOf(name);return html.slice(a,html.indexOf('\n}\n',a)+3)}).join('\n');
const dragSource=html.slice(html.indexOf('const SPECIMEN_DRAG_RADIANS_PER_PIXEL='),html.indexOf('const EMIT_COUNT='));
const prelude=`
 const mul4=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
 const rotY=a=>new Float32Array([Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1]);
 const translate3=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
 let spec={id:1},selected=0,isolatedSpecimenFrame=false,nanoAction=null,auto=true,drag=false,videoRecording=null;
 let viewer={morph:null};const performance={now:()=>clock};let clock=0;
`;
function harness(){
 const c=vm.createContext({Math,Float32Array});
 vm.runInContext(prelude+quatSource+dragSource+source,c);
 return vm.runInContext('({view:specimenInspectionCamera,tick:tickSpecimenInspection,reset:resetSpecimenInspection,drag:(dx,dy)=>{clock+=16;rotateSpecimenByPointer(dx,dy)},setDragging:v=>{drag=v},rotY,translate3,mul4,setSpec:s=>{spec=s},setAuto:v=>{auto=v},setIsolated:v=>{isolatedSpecimenFrame=v},setMorph:v=>{viewer.morph=v},state:specimenInspection})',c);
}
// Rotation of the specimen as seen by the camera, relative to a reference attitude.
function relative(a,b){const m=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)m[r*3+c]=a[r]*b[c]+a[4+r]*b[4+c]+a[8+r]*b[8+c];return m}
function angleOf(m){return Math.acos(Math.max(-1,Math.min(1,(m[0]+m[4]+m[8]-1)/2)))}
function axisOf(m){const v=[m[7]-m[5],m[2]-m[6],m[3]-m[1]],l=Math.hypot(...v);return v.map(x=>x/l)}
test('one full turn every 30 s about a random camera-space axis, even while the sky orbits',()=>{
 const h=harness(),step=.1;let first=null,half=null,full=null;
 for(let i=0;i<=300;i++){
  const t=i*step,ambient=h.mul4(h.rotY(-.03*t),h.translate3(0,0,-20)),model=h.translate3(3,0,0);
  const seen=h.mul4(h.view(ambient,model),model);
  if(i===0)first=seen;if(i===150)half=seen;if(i===300)full=seen;
  assert.ok(Math.abs(ambient[8]-h.rotY(-.03*t)[8])<1e-6,'ambient camera must not be mutated');
  if(i<300)h.tick(step);
 }
 const mid=relative(half,first);
 assert.ok(Math.abs(angleOf(mid)-Math.PI)<.02,'half a turn at 15 s: '+angleOf(mid));
 assert.ok(angleOf(relative(full,first))<.02,'back to the start after 30 s');
 const axis=h.state.axis;assert.ok(Math.abs(Math.hypot(...axis)-1)<1e-9);assert.ok(Math.abs(axis[2])<=.55,'never a flat roll about the line of sight');
 const quarter=harness();quarter.view(h.translate3(0,0,-20),h.translate3(0,0,0));for(let i=0;i<75;i++)quarter.tick(.1);
 const q=relative(quarter.mul4(quarter.view(h.translate3(0,0,-20),h.translate3(0,0,0)),h.translate3(0,0,0)),h.translate3(0,0,-20));
 const got=axisOf(q),want=quarter.state.axis;assert.ok(Math.abs(Math.abs(got[0]*want[0]+got[1]*want[1]+got[2]*want[2])-1)<1e-3,'turns about the chosen axis');
});
test('axes differ between specimens',()=>{
 const h=harness(),cam=h.translate3(0,0,-20),seen=new Set();
 for(let k=0;k<6;k++){h.setSpec({id:k});h.view(cam,h.translate3(0,0,0));seen.add(h.state.axis.map(v=>v.toFixed(3)).join());}
 assert.ok(seen.size>=5);
});
test('specimen orbit preserves world position and projected centre',()=>{
 const h=harness(),view=h.mul4(h.rotY(-.6),h.translate3(0,0,-20));
 const model=h.mul4(h.translate3(4,2,1),h.rotY(.3));
 h.view(view,model);h.tick(12);
 const c=h.view(view,model),before=h.mul4(view,model),after=h.mul4(c,model);
 for(const i of [12,13,14])assert.ok(Math.abs(after[i]-before[i])<1e-5,'projected centre drift');
 assert.notEqual(c[0],view[0]);
});
test('drag is a camera-space trackball: the facing surface follows the finger at any attitude',()=>{
 const h=harness(),cam=h.translate3(0,0,-20),body=h.translate3(0,0,0);
 h.setAuto(false);h.view(cam,body);
 for(const [dx,dy,axis] of [[100,0,[0,1,0]],[0,100,[1,0,0]],[-60,80,[.8,-.6,0]]]){
  const before=h.mul4(h.view(cam,body),body);h.setDragging(true);h.drag(dx,dy);h.setDragging(false);
  const after=h.mul4(h.view(cam,body),body),m=relative(after,before);
  assert.ok(Math.abs(angleOf(m)-Math.hypot(dx,dy)*.009)<1e-4);
  const got=axisOf(m);assert.ok(Math.abs(got[0]-axis[0])<1e-4&&Math.abs(got[1]-axis[1])<1e-4&&Math.abs(got[2])<1e-4,JSON.stringify(got));
  h.state.velocity=[0,0,0];
 }
 // The front of the body moves the way the finger moves (right drag → +x, down drag → -y).
 h.reset(null);h.setSpec({id:9});h.view(cam,body);h.drag(100,0);let m=h.mul4(h.view(cam,body),body);assert.ok(m[8]>0);
 h.reset(null);h.setSpec({id:10});h.view(cam,body);h.drag(0,100);m=h.mul4(h.view(cam,body),body);assert.ok(m[9]<0);
});
test('release glides and settles; a new specimen starts fresh',()=>{
 const h=harness(),cam=h.translate3(0,0,-20),body=h.translate3(0,0,0);h.setAuto(false);h.view(cam,body);
 h.setDragging(true);h.drag(40,0);h.setDragging(false);
 const a=h.mul4(h.view(cam,body),body);h.tick(.1);const b=h.mul4(h.view(cam,body),body);
 assert.ok(angleOf(relative(b,a))>.01,'glides after release');
 for(let i=0;i<60;i++)h.tick(.1);assert.equal(Math.hypot(...h.state.velocity),0,'glide settles');
 h.setSpec({id:2});const changed=h.view(cam,body);
 assert.ok(angleOf(relative(h.mul4(changed,body),h.mul4(cam,body)))<1e-6);
 assert.deepEqual(Array.from(h.state.quat),[0,0,0,1]);
});
test('isolated previews do not mutate observation and handoff pauses the spin',()=>{
 const h=harness(),cam=h.translate3(0,0,-20),body=h.rotY(0);
 h.setIsolated(true);assert.equal(h.view(cam,body),cam);assert.equal(h.state.specimen,null);
 h.setIsolated(false);h.view(cam,body);h.setMorph({mode:'camera-pan'});
 h.tick(1);assert.deepEqual(Array.from(h.state.quat),[0,0,0,1]);
});
test('sky is drawn with original camera; world locomotion remains separate',()=>{
 const sky=html.indexOf('drawStudioGL(undefined,pr,cam,thumbSize>0&&!postEffects)');
 const foreground=html.indexOf('const corrected=specimenInspectionCamera(cam,base);if(corrected!==cam)base=mul4(rigidInverse(cam),mul4(corrected,base));');
 assert.ok(sky>=0&&foreground>sky);
 assert.match(html,/tickSpecimenInspection\(Math\.min\(elapsed,\.15\)\)/);
 assert.doesNotMatch(source,/pulseTravel\.position\s*=/);
});

test('the turn is applied to the body in world space so tentacles feel it, with an identical picture',()=>{
 const a=html.indexOf('function rigidInverse(');const inv=html.slice(a,html.indexOf('\n}\n',a)+3);
 const h=harness(),c=vm.createContext({});vm.runInContext(inv,c);const rigidInverse=vm.runInContext('rigidInverse',c);
 const cam=h.mul4(h.rotY(-.7),h.translate3(1,2,-20)),base=h.mul4(h.translate3(3,-1,2),h.rotY(.4));
 h.view(cam,base);for(let i=0;i<40;i++)h.tick(.1);
 const corrected=h.view(cam,base),moved=h.mul4(rigidInverse(cam),h.mul4(corrected,base));
 const viaCamera=h.mul4(corrected,base),viaBody=h.mul4(cam,moved);
 for(let i=0;i<16;i++)assert.ok(Math.abs(viaCamera[i]-viaBody[i])<1e-4,'same picture at '+i);
 assert.ok(Math.abs(moved[0]-base[0])>.01,'the body itself turned in world space');
 const id=h.mul4(rigidInverse(cam),cam);for(let i=0;i<16;i++)assert.ok(Math.abs(id[i]-(i%5===0?1:0))<1e-5);
});
