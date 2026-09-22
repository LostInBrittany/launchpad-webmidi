import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import * as buttons from '../lib/buttons.js';

describe('decodeModifier', () => {
    test('parses row modifiers', () => {
        assert.deepEqual(buttons.decodeModifier('r4'), { row: true, nr: 4 });
        assert.deepEqual(buttons.decodeModifier('R0'), { row: true, nr: 0 });
        assert.deepEqual(buttons.decodeModifier('r8'), { row: true, nr: 8 });
    });

    test('parses column modifiers', () => {
        assert.deepEqual(buttons.decodeModifier('c4'), { row: false, nr: 4 });
        assert.deepEqual(buttons.decodeModifier('C0'), { row: false, nr: 0 });
        assert.deepEqual(buttons.decodeModifier('c8'), { row: false, nr: 8 });
    });

    test('parses the scene modifier', () => {
        assert.deepEqual(buttons.decodeModifier('sc'), { row: true, nr: 8 });
        assert.deepEqual(buttons.decodeModifier('SC'), { row: true, nr: 8 });
    });

    test('parses the automap modifier', () => {
        assert.deepEqual(buttons.decodeModifier('am'), { row: false, nr: 8 });
        assert.deepEqual(buttons.decodeModifier('AM'), { row: false, nr: 8 });
    });

    test('reports an error for an unrecognised modifier', () => {
        assert.deepEqual(buttons.decodeModifier('xy'), { error: true });
        assert.deepEqual(buttons.decodeModifier('ry'), { error: true });
        assert.deepEqual(buttons.decodeModifier('r'), { error: true });
        assert.deepEqual(buttons.decodeModifier('c'), { error: true });
        assert.deepEqual(buttons.decodeModifier(undefined), { error: true });
        assert.deepEqual(buttons.decodeModifier(''), { error: true });
    });
});

describe('numbersFromCoords', () => {
    test('recognises x and X as selection markers', () => {
        assert.deepEqual(buttons.numbersFromCoords(':x.X.x.X.x.X.'), [0, 2, 4, 6, 8, 10]);
    });

    test('treats the first character as position 8', () => {
        assert.deepEqual(buttons.numbersFromCoords('xx.X.x.X.x.X.'), [8, 0, 2, 4, 6, 8, 10]);
    });

    test('returns an empty array for empty or invalid input', () => {
        assert.deepEqual(buttons.numbersFromCoords('asdf'), []);
        assert.deepEqual(buttons.numbersFromCoords(''), []);
        assert.deepEqual(buttons.numbersFromCoords(undefined), []);
    });
});

describe('asRow and asCol', () => {
    test('asRow fixes the first coordinate', () => {
        assert.deepEqual(buttons.asRow(2, [0, 3]), [[2, 0], [2, 3]]);
    });

    test('asCol fixes the second coordinate', () => {
        assert.deepEqual(buttons.asCol(2, [0, 3]), [[0, 2], [3, 2]]);
    });
});

describe('uniqueCoords', () => {
    test('removes duplicate coordinates', () => {
        assert.deepEqual(
            buttons.uniqueCoords([[1, 2], [2, 1], [1, 2], [1, 2]]),
            [[1, 2], [2, 1]]
        );
    });

    test('handles empty and single-element input', () => {
        assert.deepEqual(buttons.uniqueCoords([]), []);
        assert.deepEqual(buttons.uniqueCoords([[1, 2]]), [[1, 2]]);
    });
});

describe('decodeString', () => {
    test('reads a run of markers', () => {
        assert.deepEqual(buttons.decodeString('r4:x..x'), [[4, 0], [4, 3]]);
        assert.deepEqual(
            buttons.decodeString('r6 XX XXX XX'),
            [[6, 0], [6, 1], [6, 3], [6, 4], [6, 5], [6, 7], [6, 8]]
        );
    });

    test('uses the first character as the position-8 overflow', () => {
        assert.deepEqual(buttons.decodeString('r2x'), [[2, 8]]);
        assert.deepEqual(buttons.decodeString('c2x'), [[8, 2]]);
    });

    test('reads scene buttons as the x=8 column', () => {
        assert.deepEqual(buttons.decodeString('sc:..xx'), [[8, 2], [8, 3]]);
    });

    test('reads automap buttons as the y=8 row', () => {
        assert.deepEqual(buttons.decodeString('AM ..X X'), [[2, 8], [4, 8]]);
    });
});

describe('decodeStrings', () => {
    test('merges several patterns', () => {
        assert.deepEqual(
            buttons.decodeStrings(['r1:x...x', 'c4:..xx']),
            [[1, 0], [1, 4], [2, 4], [3, 4]]
        );
    });

    test('purges coordinates duplicated across patterns', () => {
        assert.deepEqual(
            buttons.decodeStrings(['r1:xx', 'c1:xxx']),
            [[0, 1], [1, 0], [1, 1], [2, 1]]
        );
    });
});

describe('invalid modifiers', () => {
    test('decode to nothing', () => {
        assert.deepEqual(buttons.getDecoder('zz')([1, 2]), []);
        assert.deepEqual(buttons.decodeString('zz:xx'), []);
    });

    test('do not leak undefined coordinates', () => {
        for (const pattern of ['zz:xx', 'r:xx', '::xx', '']) {
            for (const pair of buttons.decodeString(pattern)) {
                assert.ok(pair.every(Number.isInteger), `${pattern} produced ${pair}`);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Known defects. These assert the behaviour the library *should* have.
// Scheduled for 2.0.0, because the fix changes public behaviour. See #15.
// ---------------------------------------------------------------------------

describe('known defects', () => {
    // Scene buttons are the x=8 column and Automap the y=8 row, and both decode
    // correctly. But rN and cN come out swapped: the `row` flag and the
    // asRow/asCol naming are each inverted, and the two cancel out only for
    // 'sc' and 'am'.
    test('rN selects a row', { todo: 'rN currently returns a column; see issue #15' }, () => {
        const ys = new Set(buttons.decodeString('r4:x..x').map(([, y]) => y));
        assert.equal(ys.size, 1, 'every coordinate should share one y');
        assert.equal([...ys][0], 4, 'and that y should be 4');
    });

    test('cN selects a column', { todo: 'cN currently returns a row; see issue #15' }, () => {
        const xs = new Set(buttons.decodeString('c4:x..x').map(([x]) => x));
        assert.equal(xs.size, 1, 'every coordinate should share one x');
        assert.equal([...xs][0], 4, 'and that x should be 4');
    });

});
