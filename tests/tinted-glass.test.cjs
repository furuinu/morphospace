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
 assert.match(source,/const depthDebug=new URLSearchParams\(location\.search\)\.get\('depthDebug'\)/);
 assert.match(source,/const glassAmount=debugShell\|\|debugOrgans\|\|wire\?0:debugGlass\?/);
 assert.match(source,/Math\.max\(0,Math\.min\(\.40,Number\(\$\('transparency'\)\.value\)\/100\|\|0\)\)/);
});

test('opaque pseudo-translucence is present in both shaders and preserves surface depth',()=>{
 assert.equal((source.match(/shaded\\.a=1\\.0;/g)||[]).length,2);
 assert.equal((source.match(/float innerVein=/g)||[]).length,2);
 assert.equal((source.match(/float innerCloud=/g)||[]).length,2);
 assert.equal((source.match(/float tissue=tissueThickness\\(vObj,vRole,vAlong\\)/g)||[]).length,2);
 assert.equal((source.match(/float tissueThickness\\(vec3 p,float role,float along\\)/g)||[]).length,2);
 const draw=source.slice(source.indexOf('function drawCopy(model,mirrored=false,glassPass=false)'),source.indexOf('const pose=wholeBodyPose(',source.indexOf('function drawCopy(model,mirrored=false,glassPass=false)')));
 assert.match(draw,/if\\(!debugOrgans&&/);
 assert.match(draw,/drawUploaded\\(useLocal\\?meshes\\.localShell:meshes\\.shell,1,false,0,0,glassAmount\\)/);
 assert.match(draw,/!debugShell&&!debugGlass&&!glassAmount/);
 assert.match(source,/gl\\.uniform1f\\(v\\.uGlassAmount,glass\\)/);
 assert.doesNotMatch(source,/for\\(const pass of \\['depth','color'\\]\\)/);
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

test('fresnel and structural colour remain available on opaque skin',()=>{
 assert.match(source,/float glassFresnel=clamp\\(uGlassAmount\\/\\.40,0\\.,1\\.\\)/);
 assert.match(source,/baseRim\\+uOpticsControl\\.x\\*glassFresnel\\*\\.55\\*pow\\(grazing,1\\.55\\)/);
 assert.match(source,/float visibleTissue=uGlassAmount/);
});

test('all inline JavaScript remains parseable',()=>{
 for(const script of scripts)if(script.trim())assert.doesNotThrow(()=>new Function(script));
});
