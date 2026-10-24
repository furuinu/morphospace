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
