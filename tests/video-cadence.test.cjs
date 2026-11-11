const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const src=html.slice(html.indexOf('const VIDEO_FRAME_MS='),html.indexOf('const VIDEO_RENDER_BUDGET_MS='));
function sched(){const f={};vm.createContext(f);vm.runInContext(src+';this.due=videoCaptureDue;this.note=noteVideoCapture;',f);return f}
function run(times){const f=sched(),job={startTime:times[0]},caps=[];let renders=0;
 for(const t of times)if(f.due(job,t)){renders++;caps.push(f.note(job,t))}
 return{job,caps,renders}}
const gaps=c=>c.slice(1).map((v,i)=>v-c[i]);
test('60 Hz display captures every other frame at an even 33 ms cadence',()=>{
 const times=Array.from({length:600},(_,i)=>1000+i*1000/60),{job,caps,renders}=run(times);
 assert.equal(renders,caps.length);assert.ok(Math.abs(caps.length-300)<=2,`${caps.length}`);
 for(const g of gaps(caps))assert.ok(Math.abs(g-1000/30)<1,`gap ${g}`);assert.equal(job.dropped,0);
});
test('120 Hz display renders only one frame in four and never doubles up',()=>{
 const times=Array.from({length:1200},(_,i)=>i*1000/120),{job,caps,renders}=run(times);
 assert.ok(Math.abs(renders-300)<=2,`${renders}`);for(const g of gaps(caps))assert.ok(Math.abs(g-1000/30)<1,`gap ${g}`);assert.equal(job.dropped,0);
});
test('jittery 60 Hz keeps captures on the 30 fps grid without drift or drops',()=>{
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const times=Array.from({length:1800},(_,i)=>i*1000/60+(rnd()-.5)*4),{job,caps}=run(times);
 assert.ok(Math.abs(caps.length-900)<=3,`${caps.length}`);
 const g=gaps(caps);assert.ok(g.every(x=>x>25&&x<42),`${Math.min(...g)} ${Math.max(...g)}`);
 assert.ok(Math.abs(caps.at(-1)-(caps.length-1)*1000/30)<20,'no cumulative drift');assert.equal(job.dropped,0);
});
test('a stalled frame skips missed slots instead of bunching catch-up captures',()=>{
 const times=[];for(let t=0;t<1000;t+=1000/60)times.push(t);for(let t=1150;t<2000;t+=1000/60)times.push(t);
 const {job,caps}=run(times);assert.ok(job.dropped>=3&&job.dropped<=5,`${job.dropped}`);
 assert.ok(gaps(caps).every(g=>g>25),'no burst after the stall');
});
test('frame loop renders the export canvas only when a capture is due, and the caption is cached',()=>{
 assert.match(html,/if\(videoRecording\)\{if\(videoCaptureDue\(videoRecording,now\)\)\{render\(videoRecording\.width,true,videoRecording\.height\);captureVideoFrame\(now\)\}\}else render\(\)/);
 assert.match(html,/job\.ctx\.drawImage\(job\.textLayer,0,0\)/);
 assert.match(html,/while\(cost>VIDEO_RENDER_BUDGET_MS&&job\.lite<2\)/);
});
test('export cost is timed with a forced GPU readback and lightened further if drops persist while recording',()=>{
 assert.match(html,/render\(job\.width,true,job\.height\);gl\.readPixels\(0,0,1,1,gl\.RGBA,gl\.UNSIGNED_BYTE,pixel\)/);
 const a=html.slice(html.indexOf('function adaptVideoLoad('),html.indexOf('function captureVideoFrame('));const f={};vm.createContext(f);vm.runInContext(a+';this.adapt=adaptVideoLoad',f);
 const job={lite:0,dropped:0};f.adapt(job,0);job.dropped=2;f.adapt(job,2100);assert.equal(job.lite,0);
 job.dropped=12;f.adapt(job,4200);assert.equal(job.lite,1);job.dropped=30;f.adapt(job,6300);assert.equal(job.lite,2);job.dropped=60;f.adapt(job,8400);assert.equal(job.lite,2);
});
