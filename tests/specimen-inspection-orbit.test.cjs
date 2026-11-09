'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('const INSPECTION_SWEEP_RADIANS='),end=html.indexOf('const viewer={',begin);
assert.ok(begin>0&&end>begin,'independent specimen inspection controller is present');
const source=html.slice(begin,end);
const prelude=`
 const mul4=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o};
 const rotY=a=>new Float32Array([Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1]);
 const translate3=(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
 let spec={id:1},selected=0,isolatedSpecimenFrame=false,nanoAction=null,auto=true,drag=false,videoRecording=null;
 let viewer={morph:null};
`;
function harness(){
 const c=vm.createContext({Math,Float32Array});
 vm.runInContext(prelude+source,c);
 return vm.runInContext('({view:specimenInspectionCamera,tick:tickSpecimenInspection,reset:resetSpecimenInspection,rotY,translate3,mul4,setSpec:s=>{spec=s},setAuto:v=>{auto=v},setIsolated:v=>{isolatedSpecimenFrame=v},setMorph:v=>{viewer.morph=v},state:specimenInspection})',c);
}
function heading(m){return Math.atan2(m[8],m[10])}
function delta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
test('30 seconds exposes 170 degrees even when sky and specimen co-rotate',()=>{
 const h=harness(),steps=300,step=.1;
 let last=null,total=0;
 for(let i=0;i<=steps;i++){
  const t=i*step,backgroundYaw=.03*t,bodyYaw=.029*t;
  const ambient=h.mul4(h.rotY(-backgroundYaw),h.translate3(0,0,-20));
  const model=h.mul4(h.translate3(3,0,0),h.rotY(bodyYaw));
  const corrected=h.view(ambient,model),rel=heading(h.mul4(corrected,model));
  if(last!==null)total+=delta(rel,last);
  last=rel;
  assert.equal(ambient[8],h.rotY(-backgroundYaw)[8],'ambient camera must not be mutated');
  if(i<steps)h.tick(step);
 }
 assert.ok(Math.abs(total-170*Math.PI/180)<.005,'actual sweep '+total);
});
test('specimen orbit preserves world position and projected centre',()=>{
 const h=harness(),view=h.mul4(h.rotY(-.6),h.translate3(0,0,-20));
 const model=h.mul4(h.translate3(4,2,1),h.rotY(.3));
 h.view(view,model);h.tick(12);
 const c=h.view(view,model),before=h.mul4(view,model),after=h.mul4(c,model);
 for(const i of [12,13,14])assert.ok(Math.abs(after[i]-before[i])<1e-5,'projected centre drift');
 assert.notEqual(c[0],view[0]);
});
test('drag preserves user-controlled yaw; new specimen resets orbit',()=>{
 const h=harness(),cam=h.mul4(h.rotY(-.2),h.translate3(0,0,-20)),body=h.rotY(.1);
 h.view(cam,body);h.tick(15);h.view(cam,body);
 h.state.manual-=.4;
 const result=h.view(cam,body);
 const measured=delta(heading(h.mul4(result,body)),heading(h.mul4(cam,body)));
 assert.ok(Math.abs(measured-(15*170*Math.PI/180/30-.4))<.02);
 h.setSpec({id:2});
 const changed=h.view(cam,body);
 assert.ok(Math.abs(delta(heading(h.mul4(changed,body)),heading(h.mul4(cam,body))))<1e-7);
 assert.equal(h.state.seconds,0);
});
test('isolated previews do not mutate observation and handoff pauses scan clock',()=>{
 const h=harness(),cam=h.translate3(0,0,-20),body=h.rotY(0);
 h.setIsolated(true);assert.equal(h.view(cam,body),cam);assert.equal(h.state.specimen,null);
 h.setIsolated(false);h.view(cam,body);h.setMorph({mode:'camera-pan'});
 h.tick(1);assert.equal(h.state.seconds,0);
});
test('sky is drawn with original camera; world locomotion remains separate',()=>{
 const sky=html.indexOf('drawStudioGL(undefined,pr,cam,thumbSize>0&&!postEffects)');
 const foreground=html.indexOf('cam=specimenInspectionCamera(cam,base)');
 assert.ok(sky>=0&&foreground>sky);
 assert.match(html,/tickSpecimenInspection\(Math\.min\(elapsed,\.15\)\)/);
 assert.doesNotMatch(source,/pulseTravel\.position\s*=/);
});
