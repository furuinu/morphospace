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
  assert.match(app, /const sharedBodyPitch=clamp\(base\*noteAt/);
  assert.match(app, /const harmonyPitch=\(role,octave=0\)/);
  assert.match(app, /const bassPitch=clamp\(harmonyPitch\(degree,0\)/);
  assert.match(app, /tune\(v,lightPitch/);
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

test('comfort stage softens the choir and preserves deliberate rests',()=>{
  assert.match(app, /state\.comfortLowpass=ctx\.createBiquadFilter\(\)/);
  assert.match(app, /state\.comfortLowpass\.frequency\.value=4600/);
  assert.match(app, /state\.master\.connect\(state\.comfortLowpass\);state\.comfortLowpass\.connect\(engine\.sampleInput\)/);
  assert.match(app, /state\.pulse\.tone\.Q\.setTargetAtTime\(clamp\(1\.1\+coupling\*\.7,\.7,2\.5\)/);
  assert.match(app, /const normalization=clamp\(Math\.sqrt\(\.42\/Math\.max\(\.22,state\.perceivedLevel\)\),\.72,1\.0\)/);
  assert.match(app, /state\.master\.gain\.setTargetAtTime\(quiet\?0:volume\*\.43\*normalization\*fade,ctx\.currentTime,\.55\)/);
  assert.match(app, /state\.comfortLowpass\?\.disconnect\(\)/);
});

test('phone-audible choir fundamental and parallel vowel formant',()=>{
  assert.match(app, /const sharedBodyPitch=clamp\(base\*noteAt/);
  assert.match(app, /vowelFormant\.type='bandpass';vowelFormant\.frequency\.value=1200/);
  assert.match(app, /vocalExciterGain\.connect\(filter\);filter\.connect\(gain\);gain\.connect\(state\.body\.out\)/);
  assert.match(app, /state\.body\.vowelFormant\.frequency\.setTargetAtTime/);
  assert.match(app, /const bassPitch=clamp\(harmonyPitch\(degree,0\)/);
  assert.match(app, /bassPresence\.gain\.value=\.22/);
});

test('hybrid choir uses a voiced glottal source and three vowel formants',()=>{
  assert.match(app, /vocalExciter\.type='sawtooth'/);
  assert.match(app, /vocalExciter\.connect\(voicedWarmth\)/);
  assert.match(app, /const vowelBands=\[\[810,1260,2800\]/);
  assert.match(app, /state\.body\.formants=formants/);
  assert.match(app, /const vowelIndex=\(seed\+Math\.floor\(t\/voiceDNA\.phraseLength\)\)%state\.body\.vowelBands\.length/);
  assert.match(app, /state\.body\.exciter\.frequency\.setTargetAtTime/);
  assert.match(app, /voice\.exciter\.stop\(\)/);
});

test('choir restores body pulse light timing with articulated voices',()=>{
  assert.match(app, /engine\.update\(individuals,quiet\|\|voiceSample\.mode==='sample'\|\|voiceSample\.mode==='choir'\?0/);
  assert.match(app, /updateVoiceSample\(quiet\);updatePureChoir\(quiet\)/);
  assert.match(app, /state\.pulse=giveVocalSource\(makeVoice\(9,450,'lowpass'\),'pulse'\)/);
  assert.match(app, /const v=giveVocalSource\(makeVoice\(8,/);
  assert.match(app, /for\(const partial of v\.oscillators\)partial\.amp\.disconnect\(\)/);
  assert.match(app, /const pulseVowel=state\.pulse\.vowelBands/);
  assert.match(app, /const lightVowel=v\.vowelBands/);
  assert.match(app, /if\(!v\.exciter&&typeof ctx\.createPeriodicWave/);
  assert.match(app, /const harmonyPitch=\(role,octave=0\)/);
  assert.match(app, /const responseWindow=voiceDNA\.response===0/);
});

test('legacy vocal registers retain body pulse light onset relationships',()=>{
  assert.match(app, /const legacyHz=midi=>440\*Math\.pow\(2,\(midi-69\)\/12\)/);
  assert.match(app, /legacyHz\(62\),legacyHz\(69\)/);
  assert.match(app, /const lightPitch=clamp\(harmonyPitch\(voiceRole,0\),legacyHz\(67\),legacyHz\(77\)\)/);
  assert.match(app, /const responseWindow=voiceDNA\.response===0/);
  assert.match(app, /if\(emission&&emission\.strength>0&&emission\.mode!==0&&light>\.38&&previous<=\.38\)/);
});
