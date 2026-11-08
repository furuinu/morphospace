'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const begin=html.indexOf('function safeSpecimenAppendages('),end=html.indexOf('function makeMorphSpecimen(',begin);
assert.ok(begin>=0&&end>begin,'front-safe appendage selector missing');
const select=new Function(html.slice(begin,end)+'return safeSpecimenAppendages;')();
const tentacle=(root,dir,length=.45)=>({delicate:{type:'strand',root,dir,length}});
function reflected(){
 return {copyLayout:1,bound:2,blobs:[{p:[-.5,0,0],axes:[.5,.5,.5]},{p:[.5,0,0],axes:[.5,.5,.5]}],
 copyTransforms:[{p:[-.45,0,0],scale:.8,angle:0,axis:'y',mirror:false},
 {p:[.45,0,0],scale:.8,angle:0,axis:'y',mirror:true}]};
}
function turnable(){
 return {copyLayout:3,bound:2.4,blobs:[{p:[0,0,0],axes:[.8,.8,.7]}],
 copyTransforms:Array.from({length:6},(_,i)=>({p:[.35*Math.cos(i*Math.PI/3),0,.35*Math.sin(i*Math.PI/3)],
 scale:.8,angle:i*Math.PI/3,axis:'y',mirror:false}))};
}
test('bilateral appendages on both poles remain lateral to a safe forward direction',()=>{
 const parts=[tentacle([0,.5,0],[0,1,0]),tentacle([0,-.5,0],[0,-1,0])];
 const result=select(reflected(),parts,12);
 assert.equal(result.parts.length,2);
 assert.ok(Math.abs(result.forward[2])===1);
});
test('an appendage on one end becomes a trailing appendage, not a leading one',()=>{
 const result=select(reflected(),[tentacle([0,.5,0],[0,1,0])],12);
 assert.equal(result.parts.length,1);
 assert.deepEqual(result.forward,[0,-1,0]);
});
test('strands that would appear forward after rotational copying are removed from the common source',()=>{
 const parts=[tentacle([0,.60,0],[0,1,0]),tentacle([0,-.55,0],[0,-1,0])];
 const result=select(turnable(),parts,12);
 assert.ok(result.parts.length>=1);
 assert.ok(result.parts.length<parts.length);
 assert.ok(Math.abs(result.forward[1])===1);
});
test('selection is deterministic and does not alter non-strand organs',()=>{
 const parts=[tentacle([0,.35,0],[0,1,0]),{delicate:{type:'fin',root:[0,.6,0]}},{role:'lung'}];
 const a=select(turnable(),parts,887),b=select(turnable(),parts,887);
 assert.deepEqual(a,b);
 assert.ok(a.parts.some(x=>x.delicate?.type==='fin'));
 assert.ok(a.parts.some(x=>x.role==='lung'));
});
test('genomes, including historic ones, cannot bypass the completed-body copy grammar',()=>{
 assert.match(html,/layout=arch\.grammar>=1&&arch\.grammar<=6\?arch\.grammar:1/);
 assert.match(html,/if\(layouts\.length<2\)throw new Error/);
 assert.doesNotMatch(html,/layout=developmental\?0:arch\.grammar/);
 assert.match(html,/frontAxis:safeAppendages\.forward/);
});
