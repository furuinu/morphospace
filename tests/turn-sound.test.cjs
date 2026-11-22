const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('turning traces the organism scale on a glass voice',()=>{
 const src=html.slice(html.indexOf('function updateTurnSound('),html.indexOf('const heartbeatBus='));
 assert.match(src,/Math\.atan2\(cameraOrbitPitchSpeed\|\|0,cameraOrbitSpeed\|\|0\)/,'heading of the drift');
 assert.match(src,/Math\.abs\(b\.acc\)>=traits\.stepDeg/,'one tone per step of degrees');
 assert.match(src,/soundMusicalProfile\(spec\)/,'tones come from the organism scale');
 assert.match(src,/turnRub\(b,now/);assert.match(src,/traits\.decay\*1\.8/,'landing tone');
 assert.match(html,/\[\[1,1\],\[2\.76,\.45\*bright\],\[5\.4,\.22\*bright\*bright\]\]/,'inharmonic glass partials');
 assert.match(html,/updateTurnSound\(quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
});
