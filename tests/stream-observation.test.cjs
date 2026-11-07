'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const between=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,'missing streaming region '+a);return html.slice(start,end);};
test('a fresh visit generates one specimen and exposes the wild/evolution control',()=>{
 const build=between('async function build(', 'async function startBreeding()');
 assert.match(build,/seeds=Array\.from\(\{length:1\}/);
 assert.match(build,/for\(let i=0;i<1;i\+\+\)/);
 assert.doesNotMatch(build,/for\(let i=0;i<64;i\+\+\)/);
 assert.match(html,/id="viewerModeQuick"[^>]*>[\s\S]*?value="wild"[\s\S]*?value="evolution"/);
 assert.match(html,/if\(viewer\.source==='gallery'&&direction>0&&selected===population\.length-1\)streamNextIndividual\(\)/);
 assert.match(html,/const STREAM_WINDOW=24;/);
});
function runtime(){
 const src=between('function streamSeed(){','let isolatedSpecimenFrame=false;');
 const data={genomes:[],population:[],pedigree:{},previewSpecimens:[],detailSpecimens:[],detailCacheOrder:[],seeds:[],selected:0,streamMode:'wild',evolutionState:null,STREAM_WINDOW:24,
  Math,console,localStorage:{data:{},setItem(k,v){this.data[k]=v},getItem(k){return this.data[k]||null}},
  $:()=>({value:'75'}),readPatternProfile:()=>({}),seedRng:n=>()=>((n%97)+1)/101,
  generateGenomeCandidate:(mode,ancestors,seed,i)=>({genome:{seed,style:Math.floor(i/8),archetype:i%8},mutationLog:[],inherited:{mode,parents:ancestors.length}}),
  pickPalette:()=>({rows:[1,2],cols:[[0,1,2],[0,1,2]]}),ensureEmissionDNA:g=>g.emissionDNA={},
  hashLineageId:(seed,index,mode)=>mode+seed+index,makeSpecimenName:(g,seed)=>'N'+seed,copyJSON:x=>JSON.parse(JSON.stringify(x)),
  MorphospaceEcology:{ensure:()=>({})},snapshotIndividual:r=>JSON.parse(JSON.stringify(r)),
  recordDisplayName:r=>r.name
 };
 vm.createContext(data);vm.runInContext(src,data);return data;
}
test('wild streaming retains at most 24 uncaptured records and diverse founders',()=>{
 const f=runtime(),styles=new Set();
 for(let i=0;i<80;i++){f.selected=f.population.length?f.population.length-1:0;vm.runInContext('streamNextIndividual()',f);styles.add(f.population.at(-1).style);assert.ok(f.population.length<=24);}
 assert.ok(styles.size>=3,'wild founder styles must not collapse into one family');
 assert.equal(f.population.length,24);assert.equal(f.seeds.length,24);assert.equal(f.genomes.length,24);assert.equal(f.previewSpecimens.length,24);
});
test('evolutional children inherit two parent IDs and persist the bounded breeding pool',()=>{
 const f=runtime();
 f.evolutionState={parents:[{id:'A',genome:{style:1},generation:0},{id:'B',genome:{style:2},generation:0}],pool:[{id:'A',genome:{style:1},generation:0},{id:'B',genome:{style:2},generation:0}],steps:0};f.streamMode='evolution';
 for(let i=0;i<18;i++){f.selected=f.population.length?f.population.length-1:0;vm.runInContext('streamNextIndividual()',f);}
 assert.equal(f.evolutionState.steps,18);
 assert.ok(f.evolutionState.pool.length<=10);
 assert.ok(f.population.every(p=>p.mode==='breed'&&p.parents.length===2&&p.generation>=1));
 assert.ok(f.localStorage.data['morphospace-evolution-v1']);
 f.evolutionState=null;vm.runInContext('restoreEvolutionState()',f);
 assert.equal(f.evolutionState.steps,18);
});
