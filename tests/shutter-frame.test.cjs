'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('function snapshotVisibleSpecimen(){'),end=html.indexOf('function canvasBlob(',begin);
assert.ok(begin>=0&&end>begin,'shutter function missing');
const source=html.slice(begin,end);
function harness(){
 const draws=[],view={width:1360,height:760,pose:{yaw:1.2,zoom:1.45,time:22}},overlay={width:1360,height:760};
 const fixture={canvas:view,rigCanvas:overlay,spec:{},selected:0,gl:{},renderer:{},
  $:()=>({checked:false}),document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(src,...args)=>draws.push({src,args})})})}};
 vm.createContext(fixture);vm.runInContext(source,fixture);return {fixture,draws,view,overlay};
}
test('shutter uses the exact displayed pixel frame with native aspect ratio',()=>{
 const {fixture,draws,view}=harness(),shot=fixture.snapshotVisibleSpecimen();
 assert.equal(shot.width,1360);assert.equal(shot.height,760);
 assert.equal(draws.length,1);assert.equal(draws[0].src,view);
 assert.deepEqual(draws[0].args,[0,0]);assert.equal(fixture.specimenImage(shot),shot);
});
test('optional rig overlay is copied in screen space without reprojection',()=>{
 const {fixture,draws,overlay}=harness();fixture.$=()=>({checked:true});fixture.snapshotVisibleSpecimen();
 assert.equal(draws.length,2);assert.equal(draws[1].src,overlay);
 assert.deepEqual(draws[1].args,[0,0,1360,760]);
});
test('save/capture/share press freezes before async work and never triggers a second render',()=>{
 const capture=html.slice(html.indexOf('async function openCaptureShare('),html.indexOf('async function saveCardToPhotos('));
 const save=html.slice(html.indexOf("$('save').onclick="),html.indexOf('async function importIndividualDNA('));
 assert.ok(capture.indexOf('const frozenFrame=snapshotVisibleSpecimen()')>=0);
 assert.ok(capture.indexOf('const frozenFrame=snapshotVisibleSpecimen()')<capture.indexOf('await saveCaptureToStock('));
 assert.ok(capture.indexOf('specimenImage(frozenFrame)')>capture.indexOf('await saveCaptureToStock('));
 assert.match(save,/const out=snapshotVisibleSpecimen\(\)/);
 assert.doesNotMatch(save,/render\(/);assert.doesNotMatch(save,/drawStudioBackground\(/);
 assert.doesNotMatch(source,/render\(/);
});
test('card, sample thumbnail and social preview fit the whole shot without cropping or stretching',()=>{
 assert.match(html,/Math\.min\(w\/image\.width,h\/image\.height\)/);
 assert.match(html,/Math\.min\(size\/image\.width,size\/image\.height\)/);
 assert.match(html,/const thumbScale=Math\.min\(240\/image\.width,240\/image\.height\)/);
});
