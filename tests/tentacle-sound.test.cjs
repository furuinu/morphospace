const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('tentacles breathe through tube voices driven by the live strands',()=>{
 const src=html.slice(html.indexOf('// Tentacle voices'),html.indexOf('const heartbeatBus='));
 assert.match(src,/m\.verlet\?\.worldPoints/,'reads live verlet strands');
 assert.match(src,/v\.osc\.type='triangle'/,'ocarina-like core');
 assert.match(src,/breathBand\.type='bandpass'/,'shakuhachi breath');
 assert.match(src,/const semis=\(1-Math\.min\(1,reach\)\)\*5/,'retracting raises the pitch');
 assert.match(src,/oct=thick>\.55\?-1/,'thick tubes sit low');
 assert.match(src,/metrics\.length<=4\?i:i%4/,'up to four voices, more are grouped');
 assert.match(html,/updateTentacleSound\(quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
});
