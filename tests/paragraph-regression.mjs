import assert from 'node:assert/strict';
import { splitParagraphs } from '../dist/paragraphs.mjs';

const bilingualScript = `Magandang araw. Maraming salamat sa iyong oras.

Our team will keep the process clear, respectful, and easy to follow.

Kung may karagdagang tanong, mangyaring ipaalam lamang sa amin.`;

assert.deepEqual(splitParagraphs(bilingualScript), [
  'Magandang araw. Maraming salamat sa iyong oras.',
  'Our team will keep the process clear, respectful, and easy to follow.',
  'Kung may karagdagang tanong, mangyaring ipaalam lamang sa amin.',
]);
assert.equal(splitParagraphs('One sentence only.').length, 1);
assert.equal(splitParagraphs(`${'Long paragraph. '.repeat(500)}`).length, 1);
console.log('paragraph regression: PASS');
