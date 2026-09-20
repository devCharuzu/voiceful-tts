import assert from 'node:assert/strict';
import { voices } from '../dist/voice-config.mjs';

const ids = Object.keys(voices);
assert.deepEqual(ids, [
  'en_US-amy-low', 'en_US-amy-medium', 'en_US-arctic-medium', 'en_US-bryce-medium',
  'en_US-danny-low', 'en_US-hfc_female-medium', 'en_US-hfc_male-medium', 'en_US-joe-medium',
  'en_US-john-medium', 'en_US-kathleen-low', 'en_US-kristin-medium', 'en_US-kusal-medium',
  'en_US-l2arctic-medium', 'en_US-lessac-high', 'en_US-lessac-low', 'en_US-lessac-medium',
  'en_US-libritts-high', 'en_US-libritts_r-medium', 'en_US-ljspeech-high', 'en_US-ljspeech-medium',
  'en_US-norman-medium', 'en_US-ryan-high', 'en_US-ryan-low', 'en_US-ryan-medium',
]);
assert.equal(voices[ids[0]].kind, 'female');
assert.equal(voices['en_US-ryan-high'].kind, 'male');
assert.equal(voices['en_US-libritts-high'].speakers, 904);
assert.ok(ids.every((id) => voices[id].modelBytes > 0 && voices[id].configBytes > 0));
assert.notEqual(voices['en_US-amy-medium'].name, voices['en_US-ryan-high'].name);
console.log('voice selection regression: PASS');
