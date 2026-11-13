const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('運動の強さ tops out at 65% (default 65%), and saved or shared settings are clamped to it',()=>{
 assert.match(html,/<input id="motionAmp" max="65" min="0" type="range" value="65"\/><output id="motionAmpNum">65%<\/output>/);
 assert.match(html,/motionAmp:\[0,65\]/);
});
