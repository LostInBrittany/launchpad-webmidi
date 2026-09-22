import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as Color from '../lib/colors.js';

describe('brightness levels', () => {
    test('red uses bits 0-1', () => {
        assert.equal(Color.red.full.code, 3);
        assert.equal(Color.red.medium.code, 2);
        assert.equal(Color.red.low.code, 1);
        assert.equal(Color.red.off.code, 0);
    });

    test('green uses bits 4-5', () => {
        assert.equal(Color.green.full.code, 48);
        assert.equal(Color.green.medium.code, 32);
        assert.equal(Color.green.low.code, 16);
        assert.equal(Color.green.off.code, 0);
    });

    test('amber is red and green at the same level', () => {
        assert.equal(Color.amber.full.code, Color.red.full.code + Color.green.full.code);
        assert.equal(Color.amber.medium.code, Color.red.medium.code + Color.green.medium.code);
        assert.equal(Color.amber.low.code, Color.red.low.code + Color.green.low.code);
        assert.equal(Color.amber.off.code, 0);
    });

    test('off is code 0 at every level', () => {
        assert.equal(Color.off.code, 0);
        assert.equal(Color.off.full.code, 0);
        assert.equal(Color.off.low.code, 0);
    });

    test('level() clamps and rounds to 0-3', () => {
        assert.equal(Color.red.level(-5).code, Color.red.off.code);
        assert.equal(Color.red.level(99).code, Color.red.full.code);
        assert.equal(Color.red.level(1.4).code, Color.red.low.code);
        assert.equal(Color.red.level(1.6).code, Color.red.medium.code);
    });
});

describe('yellow', () => {
    // Yellow hard-codes the red/green pair that reads as yellow, which leaves
    // no room to encode a level. This is a hardware limitation, not a defect.
    test('has a single brightness', () => {
        assert.equal(Color.yellow.low.code, 50);
        assert.equal(Color.yellow.medium.code, 50);
        assert.equal(Color.yellow.full.code, 50);
    });

    test('still switches off', () => {
        assert.equal(Color.yellow.off.code, 0);
    });
});

describe('buffer modifiers', () => {
    test('clear adds 8', () => {
        assert.equal(Color.red.full.clear.code, Color.red.full.code + 8);
        assert.equal(Color.red.medium.clear.code, Color.red.medium.code + 8);
    });

    test('copy adds 4', () => {
        assert.equal(Color.amber.medium.copy.code, Color.amber.medium.code + 4);
    });

    test('copy and clear combine', () => {
        assert.equal(Color.green.full.clear.copy.code, Color.green.full.code + 8 + 4);
    });
});

describe('immutability', () => {
    test('deriving a level leaves the original untouched', () => {
        const before = Color.red.code;
        Color.red.low;
        Color.red.level(0);
        assert.equal(Color.red.code, before);
    });

    test('deriving a modifier leaves the original untouched', () => {
        const before = Color.green.code;
        Color.green.clear;
        Color.green.copy;
        assert.equal(Color.green.code, before);
    });

    test('each accessor returns a new object', () => {
        assert.notEqual(Color.red.low, Color.red.low);
    });
});
