'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const defs=[...html.matchAll(/vec4 chromaticSkinFlow\(vec3 point,vec3 normal,vec3 view\)\{([\s\S]*?)\n\}/g)].map(m=>m[1]);
test('skin flow uses discrete comb particles in both shader paths',()=>{
 assert.equal(defs.length,2);
 assert.equal((html.match(/chromaticSkinFlow\(vObj,vNormal,vView\)/g)||[]).length,2);
 for(const code of defs){
  assert.match(code,/rowId=floor\(rowCoordinate\+\.5\)/);
  assert.match(code,/beadId=floor\(beadCoordinate\+\.5\)/);
  assert.match(code,/particle=rowShape\*beadShape/);
  assert.match(code,/propagation=beadId/);
  assert.match(code,/float brightness=particle\*/);
  assert.doesNotMatch(code,/uEmit[0-3]|uEmission|uBlinkMode|uBlinkSpeed|emissionBlink/);
  assert.doesNotMatch(code,/float crest=|float vein=|float radial=/);
 }
});
test('legacy emission layer and new particle flow remain separate',()=>{
 assert.match(html,/vec4 emissionSurfaceColor\(/);
 assert.equal((html.match(/vec4 shaded=emissionSurfaceColor\(color,vObj\);/g)||[]).length,2,
  'Both shader paths retain the luminous emission layer after ocular removal');
 assert.doesNotMatch(html,/if\(optical\)\{|bool optical=vRole/,
  'Retired eye-only optics must not remain as an orphan material branch');
 assert.match(html,/vec4 skinLight=chromaticSkinFlow\(vObj,vNormal,vView\)/);
 assert.match(html,/uBlinkMode/);
});
