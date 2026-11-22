const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('turning sings a choir vowel that glides along the organism scale',()=>{
 const src=html.slice(html.indexOf('function updateTurnSound('),html.indexOf('// Branch clicks'));
 assert.match(src,/Math\.atan2\(cameraOrbitPitchSpeed\|\|0,cameraOrbitSpeed\|\|0\)/);
 assert.match(src,/soundMusicalProfile\(spec\)/);
 assert.match(src,/\(\.2\/3\)\*2\.2/,'about a third of a choir voice');
 assert.match(html,/function choirBusInput\(engine\)\{return \(typeof pureChoir!=='undefined'&&pureChoir\?\.master\)\|\|engine\.sampleInput;\}/);
});
test('branch clicks ratchet with the shader branch motion, sized per branch',()=>{
 const src=html.slice(html.indexOf('// Branch clicks'),html.indexOf('const heartbeatBus='));
 assert.match(src,/identity=phase\*17\.31\+role\*19\.7\+7\.41/,'mirrors branchJointWarp');
 assert.match(src,/br\.hz,\.2\*\(\.55\+\.6\*br\.size\)/);assert.match(src,/br\.rig\?\.now/,'measures actual rig bending');
 assert.match(src,/\$\('branchMotion'\)\.checked/);
 assert.match(html,/updateBranchClicks\(quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
});
