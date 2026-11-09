'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'index.html'),'utf8');
const php=fs.readFileSync(path.join(root,'share','index.php'),'utf8');
const pull=fs.readFileSync(path.join(root,'deploy','xserver-pull.sh'),'utf8');

test('XServer production uploads OG thumbnails to its own API',()=>{
 assert.match(code,/SAME_ORIGIN_SHARE=location\.hostname==='morphospace\.masalakitchen\.jp'/);
 assert.match(code,/new URL\('\.\/share\/index\.php\?api='\+path,location\.href\)/);
 assert.match(code,/state\.ogpLink=ticket\.url/);
 assert.match(code,/X-Morphospace-Share/);
 assert.match(php,/MS_HOST = 'https:\/\/morphospace\.masalakitchen\.jp'/);
});
test('XServer release publishes PHP but preserves its private image data',()=>{
 assert.match(pull,/share\/index\.php/);
 assert.match(pull,/morphospace-share-data/);
 assert.doesNotMatch(pull,/rm -rf "\$TARGET"/);
 assert.match(php,/dirname\(__DIR__, 4\) . '\/morphospace-share-data'/);
 assert.match(php,/MS_UPLOAD_LIMIT = 200000/);
});
const hasPhp=spawnSync('php',['-v'],{stdio:'ignore'}).status===0;
function sha(value){return crypto.createHash('sha256').update(value).digest('hex')}
async function freePort(){
 return new Promise((resolve,reject)=>{
  const s=net.createServer();s.once('error',reject);
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});
 });
}
async function ready(url){
 for(let n=0;n<65;n++){
  try{const r=await fetch(url);if(r.status===200)return;}catch(_){}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('local PHP share server did not become ready');
}
test('PHP persists JPEG and DNA and serves the public OG page', {skip:!hasPhp},async()=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'morphospace-share-'));
 let server=null;
 try{
  const port=await freePort(),origin='http://127.0.0.1:'+port;
  server=spawn('php',['-S','127.0.0.1:'+port,'-t',path.join(root,'share')],{
   env:{...process.env,MORPHOSPACE_SHARE_STORAGE:work},stdio:['ignore','ignore','ignore']});
  await ready(origin+'/index.php?api=health');
  const image=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCFAUgH/9k=','base64');
  const dna=Buffer.from([77,81,1,2,3,4,5,6,7,8,9]).toString('base64url');
  const headers={'Origin':origin,'X-Morphospace-Share':'1'};
  const ticketResponse=await fetch(origin+'/index.php?api=ticket',{method:'POST',
   headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify({d:dna,imageHash:sha(image),title:'テスト標本',description:'一瞬の姿を保存'})});
  const ticketText=await ticketResponse.text();
  assert.equal(ticketResponse.status,200,ticketText);
  const ticket=JSON.parse(ticketText);
  assert.match(ticket.ticket,/^[a-f0-9]{32}$/);
  let proof=-1;for(let i=0;i<500000;i++)if(sha(ticket.ticket+':'+i).startsWith('0000')){proof=i;break;}
  assert.ok(proof>=0,'proof should be found');
  const upload=await fetch(origin+'/index.php?api=upload',{method:'POST',
   headers:{...headers,'Content-Type':'image/jpeg','X-Share-Ticket':ticket.ticket,'X-Share-Proof':String(proof)},
   body:image});
  const uploadText=await upload.text();
  assert.equal(upload.status,200,uploadText);
  const saved=JSON.parse(uploadText),id=new URL(saved.url).searchParams.get('id');
  assert.ok(id);
  assert.deepEqual(fs.readFileSync(path.join(work,'images',id+'.jpg')),image);
  assert.equal(fs.existsSync(path.join(work,'records',id+'.json')),true);
  const page=await fetch(origin+'/index.php?id='+id),body=await page.text();
  assert.equal(page.status,200);
  assert.match(body,/property="og:image"/);
  assert.match(body,/テスト標本/);
  assert.ok(body.includes('#q='+dna),'DNA fragment should reopen the same 3D specimen');
  const imageResponse=await fetch(origin+'/index.php?image='+id);
  assert.equal(imageResponse.headers.get('content-type'),'image/jpeg');
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()),image);
 } finally {
  if(server){server.kill();await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('close',resolve);setTimeout(resolve,1500);});}
  fs.rmSync(work,{recursive:true,force:true});
 }
});
test('share PHP syntax is valid', {skip:!hasPhp},()=>{
 const run=spawnSync('php',['-l',path.join(root,'share','index.php')],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr||run.stdout);
});
