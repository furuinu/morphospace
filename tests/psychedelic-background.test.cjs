'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const html=readFileSync(join(__dirname,'..','index.html'),'utf8');

test('six marine gradient presets remain available after psychedelic removal',()=>{
 assert.doesNotMatch(html,/id="viewerBackgroundFamily"/);
 for(const id of ['deepsea','predawn','sunrise','twilight','nebula','moonlit']){
  assert.match(html,new RegExp('value="'+id+'"'));
 }
 for(const id of ['psyflow','psykaleido','psycell','psystripes']){
  assert.doesNotMatch(html,new RegExp('value="'+id+'"'));
 }
 assert.match(html,/const backgroundFamily=id=>'marine'/);
 assert.match(html,/const backgroundCycle=/);
 assert.match(html,/id="viewerBackgroundRandom"/);
});

test('removed psychedelic shaders and clocks are not restored',()=>{
 assert.doesNotMatch(html,/globalThis\.MorphospacePsyBackground/);
 assert.doesNotMatch(html,/psyScene\(/);
 assert.doesNotMatch(html,/uPsy[0-9]/);
 assert.doesNotMatch(html,/psychedelicTime/);
 assert.doesNotMatch(html,/viewerPsySpeed/);
 assert.match(html,/vec2 p=\(vStudioUv-vec2\(\.5,\.49\)\)\*1\.0;/);
 assert.match(html,/float t=0\.0;/);
});

test('background shader remains inline for the Pages dependency whitelist',()=>{
 assert.doesNotMatch(html,/<script[^>]*src="psychedelic-background\.js/);
 assert.match(html,/<script src="about-i18n\.js" defer><\/script>/);
});
