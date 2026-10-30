'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const html=readFileSync(join(__dirname,'..','index.html'),'utf8');

test('marine and psychedelic backgrounds use independent family selectors',()=>{
 assert.match(html,/id="viewerBackgroundFamily"/);
 assert.match(html,/value="marine"/);
 assert.match(html,/value="psychedelic"/);
 for(const id of ['psyflow','psykaleido','psycell','psystripes']){
  assert.match(html,new RegExp('value="'+id+'"'));
 }
 assert.match(html,/backgroundFamily\(p.id\)===backgroundCycle\.family/);
});

test('the six specimen pigments and movement clock drive the WebGL backdrop',()=>{
 assert.match(html,/globalThis\.MorphospacePsyBackground=Object\.freeze/);
 assert.match(html,/\$\{globalThis\.MorphospacePsyBackground\.glsl\}/);
 for(let n=0;n<6;n++)assert.match(html,new RegExp('uPsy'+n));
 assert.match(html,/psychedelicTime\+=Math\.min\(elapsed,\.18\)/);
 assert.match(html,/paletteFade/);
 assert.match(html,/gl\.uniform1f\(surface\.uPsyTo,backgroundCycle\.toMode\)/);
});

test('background shader remains inline for the Pages dependency whitelist',()=>{
 assert.doesNotMatch(html,/<script[^>]*src="psychedelic-background\.js/);
 assert.match(html,/<script src="about-i18n\.js" defer><\/script>/);
});
