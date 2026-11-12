const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const slice=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
test('edge taps step specimens with or without controls; centre taps toggle controls',()=>{
 const calls=[];const f={viewer:{full:true},canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1200,height:900})},startViewerMorph:d=>calls.push(['morph',d]),setViewerNavigationVisible:v=>calls.push(['nav',v]),$:()=>({classList:{contains:()=>true}})};
 vm.createContext(f);vm.runInContext(slice('// Step zones:','// Screen-space hit test')+html.slice(html.indexOf('function viewerTapAction('),html.indexOf('\n}\n',html.indexOf('function viewerTapAction('))+3),f);
 // width 1200 → zones x<200 / x>1000; height 900 → y 300..600
 vm.runInContext('viewerTapAction(100,450);viewerTapAction(1100,450);viewerTapAction(100,310);viewerTapAction(1100,590);viewerTapAction(100,250);viewerTapAction(1100,700);viewerTapAction(260,450);viewerTapAction(600,450);viewer.full=false;viewerTapAction(100,450);',f);
 assert.deepEqual(calls,[['morph',-1],['morph',1],['morph',-1],['morph',1],['nav',true],['nav',true],['nav',true],['nav',true],['nav',true]]);
 assert.match(html,/&&!\$\('videoSaveDialog'\)\.open\)viewerTapAction\(e\.clientX,e\.clientY\);/);
});
test('long press on the specimen opens capture; movement, release or a second finger cancels it',()=>{
 assert.match(html,/VIEWER_LONG_PRESS_MS=550/);
 assert.match(html,/if\(viewerGestureBlocked\(\)\|\|\$\('viewerSettings'\)\.open\|\|!specimenHitAt\(press\.x,press\.y\)\)return;\n\s*viewerTap=null;drag=false;previous=null;[^\n]*\n\s*openCaptureShare\('capture'\);/);
 assert.match(html,/Math\.hypot\(e\.clientX-viewerLongPress\.x,e\.clientY-viewerLongPress\.y\)>8\)cancelViewerLongPress\(\);/);
 assert.match(html,/if\(viewerLongPress\?\.id===e\.pointerId\)cancelViewerLongPress\(\);/);
 assert.match(html,/viewerTap=null;cancelViewerLongPress\(\);beginPinch\(\);/);
 assert.match(html,/#glview\{-webkit-touch-callout:none;/);assert.match(html,/canvas\.addEventListener\('contextmenu',event=>event\.preventDefault\(\)\);/);
});
test('hit test projects the drawn primary copy and only accepts presses on the specimen',()=>{
 const f={canvas:{getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})},viewerHitFrame:null};vm.createContext(f);
 vm.runInContext(slice('function specimenHitAt(','function viewerGestureBlocked(')+';this.hit=specimenHitAt;',f);
 const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],d=new Float32Array(17*3);[[0,0,0],[.2,.1,0],[-.1,-.2,0]].forEach((v,i)=>d.set(v,i*17));
 f.viewerHitFrame={mvp:I,meshes:[{data:d}]};
 assert.equal(f.hit(400,300),true,'centre vertex');assert.equal(f.hit(480,270),true,'(.2,.1) projects to 480,270');
 assert.equal(f.hit(60,60),false,'empty water');assert.equal(f.hit(780,300),false);
 assert.match(html,/if\(copyIndex===0&&!glassPass\)viewerHitFrame=\{mvp,meshes:/);
});
