import assert from 'node:assert/strict';
import { deliveryStyles } from '../dist/delivery-styles.mjs';

assert.deepEqual(Object.keys(deliveryStyles), ['professional', 'warm', 'calm', 'energetic', 'serious']);
assert.equal(deliveryStyles.professional.renderRate, 1);
assert.ok(deliveryStyles.calm.renderRate < deliveryStyles.professional.renderRate);
assert.ok(deliveryStyles.energetic.renderRate > deliveryStyles.professional.renderRate);
assert.ok(deliveryStyles.calm.volume < deliveryStyles.professional.volume);
assert.ok(deliveryStyles.warm.previewPitch > deliveryStyles.professional.previewPitch);
console.log('delivery style regression: PASS');
