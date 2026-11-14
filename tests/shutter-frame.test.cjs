'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('function snapshotVisibleSpecimen(){'),end=html.indexOf('function canvasBlob(',begin);
assert.ok(begin>=0&&end>begin,'shutter function missing');
const source=html.slice(begin,end);
function harness(){
 const draws=[],view={width:1360,height:760,pose:{yaw:1.2,zoom:1.45,time:22}};
 const fixture={canvas:view,spec:{},selected:0,gl:{},renderer:{},
  $:()=>({checked:false}),document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(src,...args)=>draws.push({src,args})})})}};
 vm.createContext(fixture);vm.runInContext(source,fixture);return {fixture,draws,view};
}
test('shutter uses the exact displayed pixel frame with native aspect ratio',()=>{
 const {fixture,draws,view}=harness(),shot=fixture.snapshotVisibleSpecimen();
 assert.equal(shot.width,1360);assert.equal(shot.height,760);
 assert.equal(draws.length,1);assert.equal(draws[0].src,view);
 assert.deepEqual(draws[0].args,[0,0]);assert.equal(fixture.specimenImage(shot),shot);
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
test('card and sample thumbnail crop around the specimen to fill the frame; the social preview keeps the whole shot',()=>{
 assert.match(html,/const crop=subjectCrop\(image\.width,image\.height,image\.subjectBox,w\/h\)/);
 assert.match(html,/CaptureShare\.subjectCrop\(image\.width,image\.height,image\.subjectBox,1\)/);
 assert.match(html,/Math\.min\(size\/image\.width,size\/image\.height\)/);
 assert.match(html,/shot\.subjectBox=specimenScreenBox\(shot\.width,shot\.height\)/);
 const a=html.indexOf(' function subjectCrop(');const src=html.slice(a,html.indexOf(' function card(',a));
 const crop=new Function(src+';return subjectCrop;')();
 // Portrait phone shot, specimen in the middle: the crop fills the landscape card window.
 const r=crop(1170,2532,{cx:585,cy:1300,w:700,h:600},964/734);
 assert.ok(Math.abs(r.sw/r.sh-964/734)<1e-6,'same shape as the window, no stretching');
 assert.ok(r.sw<=1170&&r.sh<=2532&&r.sx>=0&&r.sy>=0&&r.sx+r.sw<=1170+1e-6&&r.sy+r.sh<=2532+1e-6,'inside the shot');
 assert.ok(r.sw>=700*1.14-1e-6&&r.sh>=600*1.14-1e-6,'the whole specimen with a margin');
 assert.ok(r.sw<1170*.85,'much tighter than the whole screen: '+r.sw);
 // A tiny specimen is not blown up past a sensible resolution; without bounds the whole shot is used.
 assert.ok(crop(1170,2532,{cx:585,cy:1266,w:60,h:60},964/734).sw>=560);
 assert.deepEqual(crop(800,600,null,1.3),{sx:0,sy:0,sw:800,sh:600});
 // Tall tentacles above a wide body: the window cannot hold everything, so the body stays in frame.
 const t=crop(527,1139,{cx:256,cy:392,w:513,h:784,core:{x0:10,x1:520,y0:520,y1:760}},964/734);
 assert.ok(t.sy<=520&&t.sy+t.sh>=760,'the body is fully inside: '+JSON.stringify(t));
 assert.ok(t.sy<520-5,'and some of the tentacles above it are shown');
});
