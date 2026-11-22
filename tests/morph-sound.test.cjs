const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('morph sounds follow the fuse transition with their own material voices',()=>{
 const src=html.slice(html.indexOf('function updateMorphSound('),html.indexOf('const heartbeatBus='));
 assert.match(src,/m\?\.mode==='fuse'/);
 assert.match(src,/fuseTremor\(\)/,'tremor and fray follow the visual shudder');
 assert.match(src,/c\.o\.detune\.setTargetAtTime\(c\.side\*apart\*28/,'copies beat apart and fold to unison');
 assert.match(src,/hzA\*Math\.pow\(hzB\/hzA,shape\)/,'shape change glides between keys');
 assert.match(src,/morphTentacleZip\(b,retracting/,'tentacles zip on retract and grow');
 assert.match(html,/updateMorphSound\(quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
});
