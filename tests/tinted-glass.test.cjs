'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const source=scripts.find(script=>script.includes('function drawCopy(model,mirrored=false,glassPass=false)'));
assert.ok(source,'specimen GPU renderer exists');

test('glass experiment limits each organism to 0–40% and remains reversible',()=>{
 assert.match(html,/色ガラス透過（個体別）/);
 assert.match(html,/id="transparency" max="40" min="0" step="1" type="range" value="0"/);
 assert.match(source,/const glassAmount=wire\?0:Math\.max\(0,Math\.min\(\.40,Number\(\$\('transparency'\)\.value\)\/100\|\|0\)\)/);
});

test('the existing moving pigment grammar tints both shader variants',()=>{
 assert.equal((source.match(/vec4 shaded=emissionSurfaceColor\(color,vObj\)/g)||[]).length,2);
 assert.equal((source.match(/shaded\.a=clamp\(1\.-uGlassAmount\+pow\(grazing,2\.3\)\*uGlassAmount\*\.68/g)||[]).length,2);
 assert.equal((source.match(/uniform float uGlassAmount;/g)||[]).length,2);
 assert.equal((source.match(/'uGlowPass','uGlassAmount','uShadeStrength'/g)||[]).length,2);
});

test('opaque organs precede front-only depth-safe glass; wireframe stays solid',()=>{
 const begin=source.indexOf('function drawCopy(model,mirrored=false,glassPass=false)');
 const end=source.indexOf('const pose=wholeBodyPose(',begin);
 const draw=source.slice(begin,end);
 assert.match(draw,/if\(glassPass\)/);
 assert.match(draw,/gl\.blendFuncSeparate\(gl\.SRC_ALPHA,gl\.ONE_MINUS_SRC_ALPHA,gl\.ZERO,gl\.ONE\)/);
 assert.match(draw,/gl\.depthMask\(false\)/);
 assert.match(draw,/gl\.depthMask\(true\)/);
 assert.match(draw,/if\(!glassAmount&&/);
 assert.match(draw,/if\(wire\)/);
 const second=source.indexOf('if(!hidden&&glassAmount>0)');
 assert.ok(second>source.indexOf('const mvpLeft=hidden?'));
 assert.ok(second<source.indexOf('if(capturePose&&(capturePose.frame.tissues'));
 assert.match(source,/if\(useLocal\)drawLocalCopies\(base,true\)/);
 assert.match(source,/drawCopy\(mirrorM,true,true\)/);
});

test('the view state is saved without shifting historical share codec keys',()=>{
 assert.match(html,/time ecologyVersion transparency'\)\.split\(' '\)/);
 assert.match(source,/'shadeStrength','transparency','fresnelStrength'/);
 assert.match(source,/transparency:\[0,40\]/);
 assert.match(source,/transparency:'transNum'/);
});

test('glass transparency is deterministic per individual and covers the 0–40% range',()=>{
 const definition=source.match(/function specimenGlassTransparency\(seed\)\{[\s\S]*?\n\}/)?.[0];
 assert.ok(definition,'seeded transparency function exists');
 const get=new Function(definition+'\nreturn specimenGlassTransparency')();
 const seeds=Array.from({length:128},(_,i)=>i+1);
 const values=seeds.map(get);
 assert.ok(values.every(v=>Number.isInteger(v)&&v>=0&&v<=40));
 assert.deepEqual(seeds.map(get),values);
 assert.ok(new Set(values).size>=25);
 assert.match(source,/if\(updateMeta\)syncSpecimenGlassTransparency\(nextSpec\)/);
 assert.match(source,/\$\('transNum'\)\.textContent=percent\+'%'/);
});

test('transparency increases pigment-glass Fresnel but not the opaque organ pass',()=>{
 assert.match(source,/float glassFresnel=clamp\(uGlassAmount\/\.40,0\.,1\.\)/);
 assert.match(source,/baseRim\+uOpticsControl\.x\*glassFresnel\*\.55\*pow\(grazing,1\.55\)/);
 const rim=glass=>.15+Math.min(1,glass/.40)*.55*Math.pow(.7,1.55);
 assert.ok(rim(.40)>rim(.20)&&rim(.20)>rim(0));
 assert.match(source,/drawUploaded\(useLocal\?meshes\.localShell:meshes\.shell,1,false,0,0,glassAmount\)/);
 assert.match(source,/for\(const pt of \(useLocal\?meshes\.localParts:meshes\.parts\)\)/);
 assert.match(source,/gl\.uniform1f\(v\.uGlassAmount,glass\)/);
});

test('all inline JavaScript remains parseable',()=>{
 for(const script of scripts)if(script.trim())assert.doesNotThrow(()=>new Function(script));
});
