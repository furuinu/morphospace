const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('calm choir keeps pitch bend and vibrato bounded', () => {
  assert.match(app, /const bendCents=clamp\([^;]+,-35,35\)/);
  assert.match(app, /const vibratoCents=clamp\([^;]+,-12,12\)/);
  assert.match(app, /bodyPitch\*Math\.pow\(2,bendCents\/1200\),vibratoCents/);
});

test('calm choir constrains resonance and distortion', () => {
  assert.match(app, /state\.body\.tone\.Q\.setTargetAtTime\(clamp\(1\.1\+deformation\*1\.4,\.7,3\.5\)/);
  assert.match(app, /state\.body\.acid\.wet\.gain\.setTargetAtTime\(\.005\+\.012\*drive/);
  assert.match(app, /state\.rhythm\.lowpass\.Q\.setTargetAtTime\(0\.8\+strain\*1\.5/);
});

test('light voices respond within shared pitch-center design', () => {
  assert.match(app, /const chordIntervals=\[0,harmonicMinor\?3:4,7,12\]/);
  assert.match(app, /const sharedBodyPitch=base\*noteAt/);
  assert.match(app, /const harmonyPitch=\(role,octave=0\)/);
  assert.match(app, /const bassPitch=harmonyPitch\(degree,-1\)/);
  assert.match(app, /tune\(v,harmonyPitch\(voiceRole/);
});

test('body and light motion coupling and independent recording remain', () => {
  assert.match(app, /function organismMotionPickups\(/);
  assert.match(app, /function roundedLightEnvelope\(/);
  assert.match(app, /function renderVoiceSample\(/);
  assert.match(app, /function updatePureChoir\(/);
  assert.match(app, /function tickBioticAudio\(/);
  assert.match(app, /voiceSample\.mode==='sample'/);
});

test('seeded vocal character remains deterministic and bounded', () => {
  const vm = require('node:vm');
  const source = app.slice(app.indexOf('function vocalCharacterDNA('),app.indexOf('function newPureChoirState('));
  const sandbox = vm.createContext({});
  vm.runInContext(source + '\nthis.character=vocalCharacterDNA;', sandbox);
  for(let seed=0;seed<256;seed++){
    const first=sandbox.character({seed});
    const again=sandbox.character({seed});
    assert.deepEqual(first,again);
    for(const field of ['breathiness','resonance','activity','silence','vibrato'])assert.ok(first[field]>=0&&first[field]<=1,field);
    assert.ok(first.phraseLength>=2.5&&first.phraseLength<=7);
    assert.ok(first.response>=0&&first.response<=3);
  }
});

test('organ phrasing has actual breath gaps and motion-led response',()=>{
  assert.match(app, /const phraseCycle=voiceDNA\.phraseLength\*\(1\+voiceDNA\.silence\*\.42\)/);
  assert.match(app, /const phraseActive=phrasePos<voiceDNA\.phraseLength/);
  assert.match(app, /const bodyLevel=\([^;]+\)\*phraseGate/);
  assert.match(app, /const responseWindow=voiceDNA\.response===0/);
  assert.match(app, /roundedLightEnvelope\(a,duration\)[^;]+\*responseWindow/);
});
