const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('運動の強さ tops out at 40% (default 40%), and saved or shared settings are clamped to it',()=>{
 assert.match(html,/<input id="motionAmp" max="40" min="0" type="range" value="40"\/><output id="motionAmpNum">40%<\/output>/);
 assert.match(html,/motionAmp:\[0,40\]/);
});
