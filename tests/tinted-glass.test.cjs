'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const source=scripts.find(script=>script.includes('function drawCopy(model,mirrored=false,glassPass=false)'));
assert.ok(source,'specimen GPU renderer exists');

test('glass experiment defaults to opaque and remains reversible',()=>{
 assert.match(html,/色ガラス透過（実験）/);
 assert.match(html,/id="transparency" max="90" min="0" step="1" type="range" value="0"/);
 assert.match(source,/const glassAmount=wire\?0:Math\.max\(0,Math\.min\(\.90,Number\(\$\('transparency'\)\.value\)\/100\|\|0\)\)/);
});

test('front glass keeps the existing pigment grammar in both material shaders',()=>{
 assert.equal((source.match(/vec4 shaded=emissionSurfaceColor\(color,vObj\)/g)||[]).length,2);
 assert.equal((source.match(/shaded\.a=clamp\(1\.-uGlassAmount\*\.84/g)||[]).length,2);
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

test('glass setting is saved and restored without shifting existing share key indices',()=>{
 assert.match(html,/time ecologyVersion transparency'\)\.split\(' '\)/);
 assert.match(source,/'shadeStrength','transparency','fresnelStrength'/);
 assert.match(source,/transparency:\[0,90\]/);
 assert.match(source,/transparency:'transNum'/);
});

test('all inline JavaScript remains parseable',()=>{
 for(const script of scripts)if(script.trim())assert.doesNotThrow(()=>new Function(script));
});
