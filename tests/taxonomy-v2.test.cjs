const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function modules(){
 const ctx=vm.createContext({TextEncoder,TextDecoder,btoa,atob,URL,URLSearchParams});
 for(const sc of scripts)if(/root\.MorphospaceEcology = api|root\.MorphospaceCaptureShare=api/.test(sc))vm.runInContext(sc,ctx);
 return {E:ctx.MorphospaceEcology,C:ctx.MorphospaceCaptureShare};
}
const {E,C}=modules();
const tax=(fields,genome)=>C.taxonomy({seed:1,genome,ecology:{version:'2.0.0',text:'x',...fields}});

test('the family is the taste the organism lives in, read from the end of the phrase first',()=>{
 const family=s=>tax({sensation:s,food:'赤い静電気',behaviorIndex:0}).family;
 assert.equal(family('人参の土に近い甘さ'),'甘露科');
 assert.equal(family('粟の粒の素朴な甘み'),'甘露科');
 assert.equal(family('焦がしたカラメルの苦味'),'苦渋科','the named quality outranks the source');
 assert.equal(family('ミントの舌に残る冷たさ'),'冷香科');
 assert.equal(family('クミンを煎った香り'),'焦香科','an aroma is placed by its source');
 assert.equal(family('チーズの皮の熟れた香り'),'脂膜科');
 assert.equal(family('花椒の舌先の痺れ'),'痺縁科');
 // Every sensation in the vocabulary lands in a named family; none falls through to an unknown one.
 const seen=new Set();for(const s of E.lexicon.sensations){const f=family(s);seen.add(f);assert.ok(!/未詳/.test(f),s);}
 assert.equal(seen.size,13);
 // Words elsewhere in the sentence no longer decide the family.
 assert.equal(tax({sensation:'人参の土に近い甘さ',food:'冷気の皮',behaviorIndex:26,text:'…冷えるたび鱗を数え直す…苦い…'}).family,'甘露科');
});
test('the genus is what it eats, and every food has a diet',()=>{
 const genus=f=>tax({sensation:'熟した桃の甘さ',food:f,behaviorIndex:0}).genus;
 assert.equal(genus('凍った寝息'),'甘露温差食属');
 assert.equal(genus('昨日の花粉'),'甘露時片食属');
 assert.equal(genus('泡の足跡'),'甘露気泡食属');
 const diets=new Map();for(const f of E.lexicon.foods){const g=genus(f);diets.set(g,(diets.get(g)||0)+1);}
 assert.equal(diets.size,17);
 assert.ok((diets.get('甘露異物食属')||0)/E.lexicon.foods.length<.15,'few foods fall to the catch-all diet');
});
test('the species is the behaviour group, with two Latin epithets per group',()=>{
 const species=new Set(),epithets=new Set();
 for(let i=0;i<300;i++){const t=tax({sensation:'熟した桃の甘さ',food:'泡の足跡',behaviorIndex:i});species.add(t.species);epithets.add(t.scientificName.split(' ')[1]);}
 assert.equal(species.size,30);assert.equal(epithets.size,60);
 assert.equal(tax({sensation:'熟した桃の甘さ',food:'泡の足跡',behaviorIndex:95}).species,'休眠種');
 assert.equal(tax({sensation:'熟した桃の甘さ',food:'泡の足跡',behaviorIndex:105}).species,'発光種');
 // Behaviour vocabulary really is grouped by tens around these themes.
 assert.ok(/眠|夢|寝/.test(E.lexicon.behaviors.slice(90,100).join('')));
 assert.ok(/光|明滅|発光|眩/.test(E.lexicon.behaviors.slice(100,110).join('')));
});
test('scientific names compound cleanly and read as binomials or trinomials',()=>{
 assert.equal(tax({sensation:'ミントの舌に残る冷たさ',food:'匂いの結び目',behaviorIndex:0}).scientificName.split(' ')[0],'Psychrozia','a vowel-initial element absorbs the stem vowel');
 assert.equal(tax({sensation:'檸檬を絞った香り',food:'遠い残響',behaviorIndex:0}).scientificName.split(' ')[0],'Oxechia');
 const names=new Map();
 for(let seed=1;seed<=4000;seed++){
  const rec={seed:seed*7919+13};E.ensure(rec);const t=C.taxonomy(rec);
  assert.match(t.scientificName,/^[A-Z][a-z]+ [a-z]+$/,'binomial without a genome: '+t.scientificName);
  names.set(t.scientificName,(names.get(t.scientificName)||0)+1);
 }
 const most=Math.max(...names.values());
 assert.ok(names.size>2400,'distinct binomials '+names.size);
 assert.ok(most<=12,'no binomial is common: '+most);
});
test('upper ranks come from the body plan and motion, the subspecies from the main pigment',()=>{
 const {C:share}=modules();
 const rec=hue=>({seed:5,genome:{seed:5},ecology:{version:'2.0.0',text:'x',sensation:'熟した桃の甘さ',food:'泡の足跡',behaviorIndex:95,hue}});
 assert.equal(share.taxonomy(rec()).className,'','no body, no class');
 share.setTraitResolver(r=>({grammar:2,motion:3,hue:r.ecology.hue??0,saturation:r.ecology.hue===null?.1:.8}));
 const t=share.taxonomy(rec(.5));
 assert.equal(t.className,'三巴綱');assert.equal(t.order,'拍動目');
 assert.equal(t.line,'三巴綱・拍動目／甘露科／甘露気泡食属／休眠種');
 assert.match(t.scientificName,/^Glycophysa (dormiens|somnolenta) cyanea$/);
 const ssp=h=>share.taxonomy(rec(h)).subspecies;
 assert.deepEqual([0,.05,.15,.25,.5,.62,.75,.9,.99].map(ssp),['rubra','aurantiaca','flava','viridis','cyanea','caerulea','violacea','rosea','rubra']);
 assert.equal(ssp(null),'pallida','a weakly coloured body');
 share.setTraitResolver(()=>{throw Error('broken genome')});
 assert.equal(share.taxonomy(rec(.5)).className,'','a failing resolver never breaks the name');
 share.setTraitResolver(()=>({grammar:99,motion:-4,hue:NaN,saturation:NaN}));
 const bad=share.taxonomy(rec(.5));assert.equal(bad.className+bad.order+bad.subspecies,'');
});
test('ecology v2: habitats avoid a third の, more sentence patterns, old prose is regenerated',()=>{
 assert.equal(E.version,'2.0.0');
 assert.equal(E.templates.length,40);
 assert.ok(E.templates.every(t=>!t.text.includes('{S}の{L}')));
 let three=0,unfilled=0;
 for(let seed=1;seed<=3000;seed++){
  const e=E.generate(seed);
  assert.ok(E.habitatLinks.some(link=>e.habitat===e.sensation+link+e.place));
  if((e.habitat.match(/の/g)||[]).length>=3)three++;
  if(/\{[A-Z]\}/.test(e.text))unfilled++;
  assert.equal(e.behaviorIndex,e.picks.behaviors);
 }
 assert.equal(unfilled,0);
 assert.ok(three/3000<.45,'habitats with three or more の: '+(three/3000).toFixed(3));
 const old={seed:42,ecology:{version:'1.0.0',text:'古い生態文',kind:'食性'}};
 assert.equal(E.ensure(old).version,'2.0.0');assert.notEqual(old.ecology.text,'古い生態文');
 const saved={seed:42,ecology:{...E.generate(7),text:'保存された生態文'}};
 assert.equal(E.ensure(saved).text,'保存された生態文','current prose is never overwritten');
 assert.deepEqual(E.generate(99),E.generate(99),'deterministic');
});
test('children inherit their parents’ taste, food and sometimes behaviour',()=>{
 let family=0,genus=0,species=0,familyStranger=0;const N=2000;
 for(let i=0;i<N;i++){
  const a=E.generate(1000+i*7),b=E.generate(500000+i*13),child=E.generate(900000+i*31,[a,b]),stranger=E.generate(700000+i*17);
  const t=e=>C.taxonomy({seed:0,ecology:e});
  const ta=t(a),tb=t(b),tc=t(child);
  if(tc.family===ta.family)family++;if(tc.genus===ta.genus||tc.genus===tb.genus)genus++;if(tc.species===ta.species||tc.species===tb.species)species++;
  if(t(stranger).family===ta.family)familyStranger++;
  assert.ok(child.inherited&&typeof child.inherited==='object');
  assert.notEqual(child.text,a.text);
 }
 assert.ok(family/N>.82,'family kept '+family/N);assert.ok(familyStranger/N<.25);
 assert.ok(genus/N>.5,'genus kept '+genus/N);
 assert.ok(species/N>.4&&species/N<.6,'species kept '+species/N);
 // A single parent (mutation) works, and broken parent data is ignored.
 assert.equal(E.generate(5,[E.generate(6)]).sensation,E.generate(6).sensation===E.generate(5,[E.generate(6)]).sensation?E.generate(6).sensation:E.generate(5,[E.generate(6)]).sensation);
 assert.deepEqual(E.generate(5,[{picks:{sensations:9999,foods:-1}}]).picks.sensations,E.generate(5).picks.sensations);
 assert.equal(E.generate(5,[null,undefined]).inherited,undefined);
});
test('the app wires classification, inheritance and sharing to the new fields',()=>{
 assert.ok(html.includes('CaptureShare.setTraitResolver(rec=>{'));
 assert.ok(html.includes("record.ecology=MorphospaceEcology.generate(seed,ancestors.filter(Boolean).map(a=>MorphospaceEcology.ensure(a)));"));
 assert.ok(html.includes("if(ancestors.length)rec.ecology=MorphospaceEcology.generate(individualSeed,ancestors.filter(Boolean).map(a=>MorphospaceEcology.ensure(a)));"));
 assert.ok(html.includes("sensation:ecology.sensation||'',food:ecology.food||'',behavior:ecology.behavior||'',...(Number.isInteger(ecology.behaviorIndex)?{behaviorIndex:ecology.behaviorIndex}:{})"));
 // A shared record survives the compact link format with its classification intact.
 const ecology=E.generate(31337),record={id:'x',name:'テスト',seed:31337,style:0,generation:0,parents:[],genome:{seed:31337,style:0,morphDNA:Object.fromEntries(['axial','flat','radial','branch','fusion','void','lobation','asymmetry','twist','budding','extension','lamella','surface','polarity','strain','shear'].map(k=>[k,.5]))},
  ecology:{version:ecology.version,text:ecology.text,kind:ecology.kind,sensation:ecology.sensation,food:ecology.food,behavior:ecology.behavior,behaviorIndex:ecology.behaviorIndex}};
 const back=C.decode(C.encode({version:1,record}));
 assert.deepEqual(C.taxonomy(back.record),C.taxonomy(record));
});
