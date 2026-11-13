const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function jelly(){const a=html.indexOf('const JELLY_STIFFNESS=');const src=html.slice(a,html.indexOf('function applyJellyUniforms(',a));
 const f={Math,WeakMap,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(f);vm.runInContext(src+';this.step=stepJelly;',f);return f}
const rotZ=(a,x=0)=>{const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,x,0,0,1]};
test('a sudden turn makes the outer tissue lag, wobble and settle',()=>{
 const f=jelly(),sp={shell:{data:new Float32Array(17*2).fill(0).map((v,i)=>i===17?2:v)}};
 let t=0,angle=0,st;const trace=[];
 for(let i=0;i<240;i++){t+=1000/60;const spin=i>=30&&i<60?3:0;angle+=spin/60;st=f.step(sp,rotZ(angle),t);trace.push(st.twist[2]);}
 const peak=Math.min(...trace.slice(30,70));assert.ok(peak<-.02,'lags against the turn: '+peak);
 assert.ok(Math.max(...trace.slice(60,140))>.005,'overshoots and springs back');
 assert.ok(Math.abs(trace.at(-1))<.01,'settles');
 assert.ok(Math.max(...trace.map(Math.abs))<=.30+1e-9,'bounded');
});
test('linear acceleration sloshes the tissue too, and big jumps are ignored',()=>{
 const f=jelly(),sp={shell:{data:new Float32Array(17*2).fill(0).map((v,i)=>i===17?1:v)}};
 let t=0,x=0,st;let worst=0;
 for(let i=0;i<120;i++){t+=1000/60;x+=i>=20&&i<30?.03:0;st=f.step(sp,rotZ(0,x),t);worst=Math.max(worst,Math.hypot(...st.shift));}
 assert.ok(worst>1e-3&&worst<=.06+1e-9,'shift '+worst);
 const g=jelly();let s2=g.step(sp,rotZ(0),0);s2=g.step(sp,rotZ(2.5),16);assert.equal(Math.hypot(...s2.twist),0,'a teleport is not a turn');
});
test('both vertex shaders bend the body with the jelly uniforms',()=>{
 assert.match(html,/vec3 jellyWarp\(vec3 p\)\{/);
 assert.equal((html.match(/\n p=jellyWarp\(p\);\n p\+=n\*uGlowPass/g)||[]).length,2);
 assert.match(html,/applyJellyUniforms\(spec,thumbSize&&!videoRecording\?null:stepJelly\(spec,base,performance\.now\(\)\)\)/);
});
