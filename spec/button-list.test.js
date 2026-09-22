import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { Buttons } from '../lib/button-list.js';

describe('All', () => {
    test('holds 80 buttons, not 81', () => {
        // (8,8) is the top-right corner, where the Automap row would meet the
        // Scene column. There is no button there on the hardware.
        assert.equal(Buttons.All.length, 80);
    });

    test('gives every button an id', () => {
        for (const button of Buttons.All) {
            assert.equal(typeof button.id, 'symbol');
        }
    });

    test('gives every button a unique id', () => {
        assert.equal(new Set(Buttons.All.map(b => b.id)).size, Buttons.All.length);
    });

    test('keeps ids stable across imports', async () => {
        const again = await import('../lib/button-list.js');
        assert.equal(again.Buttons.All[0].id, Buttons.All[0].id);
    });

    test('contains no duplicate coordinates', () => {
        const seen = new Set(Buttons.All.map(([x, y]) => `${x},${y}`));
        assert.equal(seen.size, Buttons.All.length);
    });
});

describe('groups', () => {
    test('Grid is the 8x8 square', () => {
        assert.equal(Buttons.Grid.length, 64);
        for (const [x, y] of Buttons.Grid) {
            assert.ok(x < 8 && y < 8, `(${x},${y}) is not a grid button`);
        }
    });

    test('Scene is the x=8 column', () => {
        assert.equal(Buttons.Scene.length, 8);
        for (const [x, y] of Buttons.Scene) {
            assert.equal(x, 8);
            assert.ok(y < 8);
        }
    });

    test('Automap is the y=8 row', () => {
        assert.equal(Buttons.Automap.length, 8);
        for (const [x, y] of Buttons.Automap) {
            assert.equal(y, 8);
            assert.ok(x < 8);
        }
    });

    test('the groups partition All exactly', () => {
        const total = Buttons.Grid.length + Buttons.Scene.length + Buttons.Automap.length;
        assert.equal(total, Buttons.All.length);
    });

    test('groups share identities with All rather than copying', () => {
        for (const group of [Buttons.Grid, Buttons.Scene, Buttons.Automap]) {
            for (const xy of group) {
                const match = Buttons.All.filter(b => b[0] === xy[0] && b[1] === xy[1]);
                assert.equal(match.length, 1, `duplicate coordinates ${xy[0]},${xy[1]}`);
                assert.equal(xy.id, match[0].id);
            }
        }
    });
});

describe('lookups', () => {
    test('byId finds every button', () => {
        for (const b of Buttons.All) {
            assert.equal(Buttons.byId(b.id), b);
        }
    });

    test('byId returns undefined for an unknown id', () => {
        assert.equal(Buttons.byId(Symbol('nope')), undefined);
    });

    test('byXy returns the button at each coordinate', () => {
        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                const b = Buttons.byXy(x, y);
                if (x === 8 && y === 8) {
                    assert.equal(b, undefined, '(8,8) should not exist');
                } else {
                    assert.deepEqual([b[0], b[1]], [x, y]);
                }
            }
        }
    });
});
