'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function motionGPUSpec('),end=html.indexOf('// v15.3',start);
assert.ok(start>=0&&end>start,'Motion GPU field generator missing');
const ctx=vm.createContext({Float32Array,Math});
vm.runInContext(`
const TAU=Math.PI*2,CYCLE_PERIODS=[1,2,3,4];
const V={norm:v=>{const len=Math.hypot(...v)||1;return v.map(x=>x/len)}};
const normalizedMotionDNA=()=>({
 primary:0,secondary:1,tempo:1,amplitude:.5,duty:.5,rest:.2,propagation:.6,
 asymmetry:.4,locality:.5,phase:.1,accent:.4,axisBias:.5,pulseCycle:1,localCycle:2
});
`+html.slice(start,end)+'globalThis.generate=motionGPUSpec;',ctx);
const g={seed:71,morphDNA:{axial:.4,radial:.3,polarity:.4}},sample={blobs:[{p:[.4,.5,.6]}],copyLayout:0};
test('developmental body axis and pressure centre control shared GPU tissue motion',()=>{
 const result=ctx.generate(g,{...sample,bodyPlan:{axis:[.6,.8,0],center:[.13,.27,.39]}});
 assert.ok(Math.abs(result.axis[0]-.6)<1e-6);
 assert.ok(Math.abs(result.axis[1]-.8)<1e-6);
 assert.ok(Math.abs(result.axis[2])<1e-6);
 assert.ok(Math.abs(result.focus[0]-.13)<1e-6);
 assert.ok(Math.abs(result.focus[1]-.27)<1e-6);
 assert.ok(Math.abs(result.focus[2]-.39)<1e-6);
});
test('legacy motion defaults remain finite when the developmental body plan is absent',()=>{
 const original=ctx.generate(g,sample);
 assert.ok([...original.axis,...original.focus].every(Number.isFinite));
 assert.ok(Math.abs(original.axis[0]-.6)>1e-3,'legacy should retain its own inherited axis');
});
test('the organogenesis engine is wired before the GPU motion specification',()=>{
 assert.match(html,/motionGPU:motionGPUSpec\(g,localGroup\?source:em\)/);
 assert.match(html,/base\.bodyPlan=\{axis,side,dorsal,center:center\.slice\(\),pairs:sidePairs,stations,copyCount:1\}/);
});
