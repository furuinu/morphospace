const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),src=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)][2][1];
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
function helpers(f={}){vm.createContext(f);vm.runInContext(section('function videoFrameSize(','function finishVideoRecording('),f);return f}
test('full-screen exports preserve portrait and landscape aspect ratios with even encoder dimensions',()=>{
 const f=helpers();for(const rect of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}])for(const resolution of [720,1080]){const d=f.videoFrameSize(resolution,'viewer',rect);assert.equal(d.width%2,0);assert.equal(d.height%2,0);assert.equal(Math.max(d.width,d.height),resolution===1080?1920:1280);assert.ok(Math.abs(d.width/d.height-rect.width/rect.height)<.005)}
 assert.deepEqual(JSON.parse(JSON.stringify(f.videoFrameSize(720,'specimen',{width:390,height:844}))),{width:1280,height:720});
});
function drawing(){const calls=[],elements={};const rect={left:0,top:0,width:390,height:844},ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},measureText:t=>({width:t.length*8}),fillText:t=>calls.push(t),drawImage:()=>calls.push('image')};
 for(const id of ['viewerTitleText','viewerSubtitleText','viewerName','viewerScientific','viewerTaxonomy','viewerEcology'])elements[id]={textContent:id,scrollTop:0,getBoundingClientRect:()=>({left:20,top:60,width:350,height:50}),display:'block'};
 const f=helpers({canvas:{getBoundingClientRect:()=>rect},rigCanvas:{},$:id=>elements[id],getComputedStyle:e=>({display:e.display,visibility:'visible',fontSize:'12px',lineHeight:'20px',fontStyle:'normal',fontWeight:'400',fontFamily:'sans-serif',color:'white'})});return{f,calls,elements,ctx};
}
test('video composites visible names, scientific names and taxonomy live, excluding hidden labels and controls',()=>{
 const {f,calls,elements,ctx}=drawing();elements.viewerName.display='none';const job={mode:'viewer',width:390,height:844,ctx};f.composeVideoFrame(job);
 assert.deepEqual(calls.slice(0,2),['image','image']);assert.ok(calls.includes('viewerScientific'));assert.ok(calls.includes('viewerTaxonomy'));assert.ok(!calls.includes('viewerName'));assert.ok(!calls.some(x=>/viewerZoom|viewerFullscreen/.test(x)));
 calls.length=0;elements.viewerScientific.textContent='New scientific name';f.composeVideoFrame(job);assert.ok(calls.includes('New scientific name'));
 calls.length=0;f.composeVideoFrame({...job,mode:'specimen'});assert.deepEqual(calls,['image','image']);
});
test('full-screen recording allows automatic morphing while the export dialog is open; regular specimen recording pauses it',()=>{
 const f={selected:0,spec:{},busy:false,videoRecording:{mode:'viewer'},nanoAction:null,nanoOperationBusy:false,stockDialog:{open:false},captureShareIsOpen:false,document:{hidden:false},$:()=>({open:true})};vm.createContext(f);vm.runInContext(section('function viewerCanAdvance(){','function startViewerMorph('),f);assert.equal(f.viewerCanAdvance(),true);f.videoRecording.mode='specimen';assert.equal(f.viewerCanAdvance(),false);f.videoRecording.mode='viewer';f.document.hidden=true;assert.equal(f.viewerCanAdvance(),false);
});
test('encoder receives a complete export-size frame before capture starts, preferring MP4',()=>{
 const events=[],elements={videoResolution:{value:'720'},videoDuration:{value:'1'},videoOrbit:{checked:true},videoVhs:{checked:true},motion:{checked:true},videoProgress:{value:0}};
 const ctx={drawImage:()=>events.push('composite')},track={stop(){},requestFrame(){}},stream={getVideoTracks:()=>[track],getTracks:()=>[track]};
 const f={console,videoRecording:null,selected:0,spec:{seed:1},captureShareIsOpen:false,nanoOperationBusy:false,nanoAction:null,animating:true,videoMode:'viewer',clearVideoResult(){},pauseViewerTransition(){},supportedVideoMimes:()=>['video/mp4','video/webm'],$:id=>elements[id]||(elements[id]={}),canvas:{getBoundingClientRect:()=>({width:390,height:844})},document:{createElement:()=>({width:0,height:0,getContext:()=>ctx,captureStream(){events.push('stream');return stream}})},cleanFilePart:x=>x,recordDisplayName:()=> 'specimen',currentIndividual:()=>({}),render:(w,p,h)=>events.push(['render',w,h]),gl:{finish:()=>events.push('finish')},composeVideoFrame:()=>events.push('complete frame'),performance:{now:()=>100},setTimeout:()=>1,videoControls(){},videoStatus(){},captureVideoFrame(){},finishVideoRecording(){},lastFrame:0,MediaRecorder:class{constructor(s,o){this.state='inactive';events.push(o.mimeType)}start(){events.push('start');this.state='recording'}},Blob,URL,File:undefined};
 vm.createContext(f);vm.runInContext(section('function videoFrameSize(','function drawVideoViewerText(')+section('function beginVideoRecording(){','function captureVideoFrame('),f);f.beginVideoRecording();
 assert.deepEqual(events.slice(1,4),['finish','complete frame','stream']);assert.ok(events.indexOf('video/mp4')<events.indexOf('start'));assert.equal(f.videoRecording.mode,'viewer');assert.equal(f.videoRecording.height,1280);assert.equal(f.videoRecording.width,592);
});
