const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const fn=name=>{const a=html.indexOf('function '+name+'(');return html.slice(a,html.indexOf('\n}',a)+2)};
function packer(){const f={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(f);
 const a=html.indexOf('function packFinProgress(');vm.runInContext(html.slice(a,html.indexOf('function dynamicMesh(',a)),f);return f}
// JS mirror of the vertex shader's unpacking.
const unpack=y=>{const q=Math.floor(y*.5),u=Math.min(1,Math.max(0,y-2*q));return {member:q>1.5,side:(q%2)>.5?-1:1,s:(Math.floor(q*.5)-1)/500,u}};
test('fin coordinates survive packing into the progress attribute; ordinary parts are untouched',()=>{
 const f=packer();
 for(const [s,u,side] of [[0,0,1],[1,1,1],[.37,.62,-1],[.5,0,-1],[.999,.001,1]]){
  const d=unpack(f.packFinProgress(s,u,side));
  assert.equal(d.member,true);assert.equal(d.side,side);assert.ok(Math.abs(d.s-s)<=.001+1e-9,`s ${d.s}`);assert.ok(Math.abs(d.u-u*.999)<1e-4,`u ${d.u}`);
 }
 for(const y of [0,.25,.5,1]){const d=unpack(y);assert.equal(d.member,false);assert.equal(d.u,y);}
 const grid=f.finGridProgress({rows:34,cols:9});const last=unpack(grid(34*9-1)),first=unpack(grid(0)),mid=unpack(grid(17*9+4));
 assert.deepEqual([first.s,first.u],[0,0]);assert.equal(last.s,1);assert.ok(last.u>.99);assert.ok(Math.abs(mid.s-17/33)<.002&&Math.abs(mid.u-.4995)<.001);
});
test('vertex shader unpacks the same way and adds a tiny ripple travelling along the fin',()=>{
 assert.match(html,/float packedQ=floor\(aParams\.y\*\.5\);\n float u=clamp\(aParams\.y-2\.0\*packedQ,0\.0,1\.0\);/);
 assert.match(html,/combMember=packedQ>1\.5\?1\.0:0\.0,combSide=mod\(packedQ,2\.0\)>\.5\?-1\.0:1\.0,combAlong=\(floor\(packedQ\*\.5\)-1\.0\)\/500\.0;/);
 assert.match(html,/float combWave\(float s,float phase,float t\)\{return mod\(t\*combRate\(phase\),6\.2831853\)-\(s\*COMB_WAVES-phase\*\.159155\)\*6\.2831853;\}/);
 assert.match(html,/return n\*side\*\.0045\*clamp\(motion,0\.,1\.8\)\*envelope\*sin\(combWave\(s,phase,t\)\);/);
 assert.match(html,/float combRate\(float phase\)\{return 19\.0\+5\.0\*/,'about 3-4 beats per second');
 assert.match(html,/shifted\+=combRipple\(canonicalNormal,combAlong,u,combMember,combSide,phase,ancestralTime,uMotion\);/);
 assert.match(html,/return vec3\(0\.\); \/\/ fins now move with the comb-plate ripple/);
 assert.equal((html.match(/varying vec2 vComb;/g)||[]).length,3,'main vertex, cilia vertex and fragment agree');
 assert.match(html,/if\(vComb\.y>\.5\)\{\n\s*float crest=cos\(vComb\.x\)/);
 assert.match(html,/vAlong=clamp\(aParams\.y-2\.0\*floor\(aParams\.y\*\.5\),0\.0,1\.0\);/,'compatibility shader decodes too');
});
test('every fin type carries its grid; anatomical fins keep their original random draws',()=>{
 assert.match(html,/if\(d\.type!=='fin'\)return Math\.min\(1,Math\.floor\(k\/d\.sides\)\/\(d\.rows-1\)\);const i=k%face;return packFinProgress\(Math\.floor\(i\/d\.sides\)\/\(d\.rows-1\),\(i%d\.sides\)\/\(d\.sides-1\),k>=face\?-1:1\);/);
 assert.match(html,/pt\.mesh\.finGrid\?finGridProgress\(pt\.mesh\.finGrid\):null/);
 assert.match(html,/const rows=40,cols=7,p=\[\],colors=\[\],faces=\[\];/);
 assert.match(html,/rows=low\?15:60,segs=low\?4:8;/);
 const src=fn('makeAnatomicalFin');assert.match(src,/const jitter=Array\.from\(\{length:baseRows\+1\},\(\)=>r\(\)\);/);
 assert.equal((src.match(/r\(\)/g)||[]).length,1,'only the 12 jitter draws consume the shared random stream');
 assert.match(src,/mesh\.finGrid=\{rows:rows\+1,cols:cols\+1\}/);
});
