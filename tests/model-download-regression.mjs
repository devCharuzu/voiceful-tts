import assert from 'node:assert/strict';
import { voices } from '../dist/voice-config.mjs';
import { getModelDownloadPercent, getModelDownloadTotals } from '../dist/model-download.mjs';

const ids = Object.keys(voices);
const totals = getModelDownloadTotals(voices, [ids[0], ids[1]]);
assert.equal(totals.ids.length, 24);
assert.equal(totals.pendingIds.length, 22);
assert.ok(totals.totalBytes > 1_000_000_000);
assert.equal(totals.completedBytes, voices[ids[0]].modelBytes + voices[ids[0]].configBytes + voices[ids[1]].modelBytes + voices[ids[1]].configBytes);

const start = getModelDownloadPercent(totals.totalBytes, totals.completedBytes);
const inFlight = getModelDownloadPercent(totals.totalBytes, totals.completedBytes, voices[ids[2]].modelBytes / 2, voices[ids[2]].modelBytes);
const complete = getModelDownloadPercent(totals.totalBytes, totals.completedBytes + voices[ids[2]].modelBytes + voices[ids[2]].configBytes);
assert.ok(inFlight > start && inFlight < complete);
assert.equal(getModelDownloadPercent(100, 100, 999, 10), 100);
assert.equal(getModelDownloadPercent(100, -50, -10, 10), 0);
console.log('model download regression: PASS');
