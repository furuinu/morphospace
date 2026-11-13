const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('fins, veils and the fin ripple are gone from generation and shaders',()=>{
 assert.match(html,/if\(ecology\.appendagePlan==='lateral_frill'\)return out;\n \/\/ Species-level rarity: retain 40% of the previously tentacled specimens\.\n if\(rng\(\)>=\.40\)return out;/);
 for(const gone of ['makeAnatomicalFin','makeVeil3','function makeVeil(','doubleSidedMembrane','combRipple','vComb','packFinProgress','finGrid','delicateWave',"mode==='fin'","type:'fin'"])
  assert.equal(html.includes(gone),false,gone);
});
test('legacy specimens keep the random draws the fins used, so their other parts are unchanged',()=>{
 assert.match(html,/\/\/ Fins were removed\. Consume the 12 draws the fin used so the rest of a legacy specimen is unchanged\.\n  for\(let k=0;k<12;k\+\+\)r\(\);/);
});
