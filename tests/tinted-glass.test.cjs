'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const source=scripts.find(script=>script.includes('function drawCopy(model,mirrored=false,glassPass=false,copyIndex=0)'));
assert.ok(source,'specimen GPU renderer exists');

test('glass experiment limits each organism to 0–40% and remains reversible',()=>{
 assert.match(html,/色ガラス透過（個体別）/);
 assert.match(html,/id="transparency" max="40" min="0" step="1" type="range" value="0"/);
 assert.match(source,/const depthDebug=new URLSearchParams\(location\.search\)\.get\('depthDebug'\)/);
 assert.match(source,/const glassAmount=debugShell\|\|debugOrgans\|\|wire\?0:debugGlass\?/);
 assert.match(source,/Math\.max\(0,Math\.min\(\.40,Number\(\$\('transparency'\)\.value\)\/100\|\|0\)\)/);
});

test('opaque skin preserves fine pigments and normal detail without pseudo-transmission',()=>{
 assert.equal(source.split('shaded.a=1.0;').length-1,2,'only the glass blocks force opaque alpha; elsewhere alpha is the emission mask');
 assert.equal(source.split('float tissue=tissueThickness(vObj,vRole,vAlong)').length-1,2);
 for(const removed of ['float innerVein=','float innerCloud=','vec3 buriedTint=','float visibleTissue=','float transmission=uGlassAmount'])assert.ok(!source.includes(removed),removed);
 assert.ok(source.includes('drawUploaded(useLocal?meshes.localShell:meshes.shell,1,false,0,0,glassAmount)'));
 // The skin's transparency must not hide external fins, tentacles or cilia.
 assert.ok(source.includes("if(!debugShell&&!debugGlass)for(const pt of (useLocal?meshes.localParts:meshes.parts))"));
 assert.ok(source.includes("if(!debugShell&&!debugGlass)drawGPUMotileCilia(mvp,model,false)"));
 assert.ok(!source.includes('!debugShell&&!debugGlass&&!glassAmount'));
 assert.ok(!source.includes("for(const pass of ['depth','color'])"));
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

test('Fresnel, interference pigment, all lights and selective highlight halo strengthened',()=>{
 assert.ok(source.includes('glassFresnel*.82*pow(edgeGrazing,3.5)'),'glass rim stays in the silhouette band');assert.ok(source.includes('float edgeGrazing=clamp(1.-abs(dot(baseNormal,view)),0.,1.);'));
 assert.ok(source.includes('float filmAmount=clamp(uOpticsControl.y*uOptics1.y*coverage*(.15+.58*pow(grazing,.7))'));
 assert.ok(source.includes('float illumination=1.10*(globalAmbient+uLightLevels.x*kd+uLightLevels.y*fd+uLightLevels.z*pow(bd,1.35)+uLowerFillPower*lowerFill)'));
 assert.ok(source.includes('float halo=smoothstep(.17,.40,clearCoat)'));
});

test('all inline JavaScript remains parseable',()=>{
 for(const script of scripts)if(script.trim())assert.doesNotThrow(()=>new Function(script));
});
test('reflections take the surrounding sky colour in the main shader only',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const assert=require('node:assert/strict');
 assert.match(html,/#ifdef MORPHO_AIR\n[^#]*vec3 surround=uAirTint;\n if\(uAirView\.z>\.5\)surround=texture2D\(uSkyProbe,gl_FragCoord\.xy\*uAirView\.xy\)\.rgb;\n environment=mix\(surround\*\(\.55\+\.65\*kd\),environment,\.15\);\n#endif/);
 const frag=html.slice(html.indexOf('const frag=`'));
 assert.ok(frag.indexOf('uniform sampler2D uSkyProbe;')<frag.indexOf('#define MORPHO_AIR 1\n${chromaticGrammarGLSL}'));
 assert.equal((html.match(/#define MORPHO_AIR 1/g)||[]).length,1,'compatibility shader keeps the fixed environment');
});
