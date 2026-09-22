import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { getNumDen } from '../lib/brightness.js';

/*
 The Launchpad expresses brightness as a duty cycle num/den, with num in 1..16
 and den in 3..18. getNumDen picks the closest available fraction.
*/

describe('getNumDen', () => {
    test('returns a [num, den, fraction] triple', () => {
        const step = getNumDen(0.5);
        assert.equal(step.length, 3);
        assert.equal(step[0] / step[1], step[2]);
    });

    test('stays inside the ranges the hardware accepts', () => {
        for (let t = 0; t <= 1; t += 0.05) {
            const [num, den] = getNumDen(t);
            assert.ok(num >= 1 && num <= 16, `num ${num} out of range at t=${t}`);
            assert.ok(den >= 3 && den <= 18, `den ${den} out of range at t=${t}`);
        }
    });

    test('never exceeds a full duty cycle', () => {
        for (let t = 0; t <= 1; t += 0.05) {
            const [num, den] = getNumDen(t);
            assert.ok(num <= den, `${num}/${den} is greater than 1 at t=${t}`);
        }
    });

    test('increases monotonically with the requested brightness', () => {
        let previous = -Infinity;
        for (let t = 0; t <= 1; t += 0.02) {
            const fraction = getNumDen(t)[2];
            assert.ok(fraction >= previous, `fraction dropped at t=${t}`);
            previous = fraction;
        }
    });

    test('clamps out-of-range input instead of returning undefined', () => {
        assert.ok(getNumDen(-1), 'negative brightness should clamp to the darkest step');
        assert.ok(getNumDen(2), 'brightness above 1 should clamp to the brightest step');
        assert.equal(getNumDen(-1)[2], getNumDen(0)[2]);
        assert.equal(getNumDen(2)[2], getNumDen(1)[2]);
    });

    test('maps the extremes to the darkest and brightest steps', () => {
        assert.ok(getNumDen(0)[2] < getNumDen(1)[2]);
        assert.equal(getNumDen(1)[2], 1, 'full brightness should be a 1:1 duty cycle');
    });
});
