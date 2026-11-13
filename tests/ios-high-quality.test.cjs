const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function ctx(store){const f={localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},timers:[],setTimeout:fn=>f.timers.push(fn)};vm.createContext(f);
 const a=html.indexOf("const HQ_RENDER_KEY=");vm.runInContext(html.slice(a,html.indexOf('function setupHighQualitySwitch(',a)),f);return f}
test('iPhone/iPad use the compatible shader unless 高品質描画 is switched on',()=>{
 const store={};const f=ctx(store);assert.deepEqual({...f.iosHighQualityStart(true)},{full:false,recovered:false});
 assert.deepEqual({...f.iosHighQualityStart(false)},{full:false,recovered:false},'other devices keep their own full-first path');
 store['morphospace-ios-high-quality']='1';const on=f.iosHighQualityStart(true);assert.equal(on.full,true);assert.equal(store['morphospace-ios-high-quality-pending'],'1');
 f.timers.forEach(fn=>fn());assert.equal(store['morphospace-ios-high-quality-pending'],undefined,'a stable launch clears the guard');
});
test('a launch that never became stable falls back to compatible rendering and switches the option off',()=>{
 const store={'morphospace-ios-high-quality':'1','morphospace-ios-high-quality-pending':'1'};const f=ctx(store);
 const r=f.iosHighQualityStart(true);assert.equal(r.full,false);assert.equal(r.recovered,true);assert.equal(store['morphospace-ios-high-quality'],'0');assert.equal(store['morphospace-ios-high-quality-pending'],undefined);
});
test('switch is wired to the renderer choice and reloads on change; Fresnel tops out at 30%',()=>{
 assert.match(html,/const hq=iosHighQualityStart\(ios\);\n  try\{renderer=initGL\(gl,ios&&!hq\.full\)\}/);
 assert.match(html,/<input id="hqRender" type="checkbox"\/> 高品質描画（iPhone・iPad）/);
 assert.match(html,/setupHighQualitySwitch\(ios,hq\);/);assert.match(html,/setTimeout\(\(\)=>location\.reload\(\),150\)/);
 assert.match(html,/<input id="fresnelStrength" type="range" min="0" max="30" value="30"\/>/);
 assert.match(html,/fresnelStrength:\[0,30\]/);assert.match(html,/Math\.min\(30,Number\(\$\('fresnelStrength'\)\?\.value\?\?30\)\)\/100/);
});
