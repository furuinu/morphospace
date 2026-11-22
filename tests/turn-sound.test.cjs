const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('branch clicks ratchet with the shader branch motion, sized per branch',()=>{
 const src=html.slice(html.indexOf('// Branch clicks'),html.indexOf('const heartbeatBus='));
 assert.match(src,/identity=phase\*17\.31\+role\*19\.7\+7\.41/,'mirrors branchJointWarp');
 assert.match(src,/br\.hz,\.2\*\(\.55\+\.6\*br\.size\)/);assert.match(html,/function choirBusInput\(engine\)/);
 assert.match(src,/JOINT_TAP\.forEach/,'articulated joints click');
 assert.match(html,/updateBranchClicks\(quiet,Number\(\$\('viewerSoundVolume'\)\.value\)\/100\)/);
});
