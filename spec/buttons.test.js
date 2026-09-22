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

    test('parses the scene modifier as a column', () => {
        // Scene buttons are the x=8 column, not a row.
        assert.deepEqual(buttons.decodeModifier('sc'), { row: false, nr: 8 });
        assert.deepEqual(buttons.decodeModifier('SC'), { row: false, nr: 8 });
    });

    test('parses the automap modifier as a row', () => {
        // Automap buttons are the y=8 row, not a column.
        assert.deepEqual(buttons.decodeModifier('am'), { row: true, nr: 8 });
        assert.deepEqual(buttons.decodeModifier('AM'), { row: true, nr: 8 });
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
    // Both emit [x, y]. asRow fixes y, asCol fixes x.
    test('asRow fixes y and varies x', () => {
        assert.deepEqual(buttons.asRow(2, [0, 3]), [[0, 2], [3, 2]]);
    });

    test('asCol fixes x and varies y', () => {
        assert.deepEqual(buttons.asCol(2, [0, 3]), [[2, 0], [2, 3]]);
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
    test('reads a row pattern as a row', () => {
        assert.deepEqual(buttons.decodeString('r4:x..x'), [[0, 4], [3, 4]]);
        assert.deepEqual(
            buttons.decodeString('r6 XX XXX XX'),
            [[0, 6], [1, 6], [3, 6], [4, 6], [5, 6], [7, 6], [8, 6]]
        );
    });

    test('reads a column pattern as a column', () => {
        assert.deepEqual(buttons.decodeString('c4:x..x'), [[4, 0], [4, 3]]);
    });

    test('uses the first character as the position-8 overflow', () => {
        assert.deepEqual(buttons.decodeString('r2x'), [[8, 2]]);
        assert.deepEqual(buttons.decodeString('c2x'), [[2, 8]]);
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
            [[0, 1], [4, 1], [4, 2], [4, 3]]
        );
    });

    test('purges coordinates duplicated across patterns', () => {
        assert.deepEqual(
            buttons.decodeStrings(['r1:xx', 'c1:xxx']),
            [[0, 1], [1, 0], [1, 1], [1, 2]]
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

describe('modifier semantics', () => {
    const axes = (pattern) => {
        const pairs = buttons.decodeString(pattern);
        return {
            xs: new Set(pairs.map(([x]) => x)),
            ys: new Set(pairs.map(([, y]) => y))
        };
    };

    test('rN selects a row', () => {
        const { ys } = axes('r4:x..x');
        assert.equal(ys.size, 1, 'every coordinate should share one y');
        assert.equal([...ys][0], 4);
    });

    test('cN selects a column', () => {
        const { xs } = axes('c4:x..x');
        assert.equal(xs.size, 1, 'every coordinate should share one x');
        assert.equal([...xs][0], 4);
    });

    test('sc selects the scene column', () => {
        const { xs } = axes('sc:..xx');
        assert.equal(xs.size, 1);
        assert.equal([...xs][0], 8);
    });

    test('am selects the automap row', () => {
        const { ys } = axes('am:..x.x');
        assert.equal(ys.size, 1);
        assert.equal([...ys][0], 8);
    });
});
