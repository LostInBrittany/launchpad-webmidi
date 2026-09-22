import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import Launchpad from '../launchpad-webmidi.js';
import {
    attachFakePorts, gridMessage, automapMessage, withFakeBrowser, FakeMidiInput, FakeMidiOutput
} from './helpers/fake-midi.js';

let pad, out, input;

beforeEach(() => {
    pad = new Launchpad();
    ({ out, input } = attachFakePorts(pad));
});

describe('construction', () => {
    test('exposes the five predefined colours', () => {
        for (const name of ['red', 'green', 'amber', 'yellow', 'off']) {
            assert.ok(pad[name], `pad.${name} should exist`);
            assert.equal(typeof pad[name].code, 'number');
        }
    });

    test('does no I/O before connect', () => {
        const fresh = new Launchpad();
        assert.equal(fresh.midiOut, undefined);
        assert.equal(fresh.midiIn, undefined);
    });
});

describe('reset', () => {
    test('turns every LED off when given no brightness', () => {
        pad.reset();
        assert.deepEqual(out.last, [0xb0, 0x00, 0]);
    });

    test('sets a brightness level between 1 and 3', () => {
        pad.reset(1);
        assert.deepEqual(out.last, [0xb0, 0x00, 0x7d]);
        pad.reset(2);
        assert.deepEqual(out.last, [0xb0, 0x00, 0x7e]);
        pad.reset(3);
        assert.deepEqual(out.last, [0xb0, 0x00, 0x7f]);
    });

    test('treats an out-of-range brightness as off', () => {
        pad.reset(9);
        assert.deepEqual(out.last, [0xb0, 0x00, 0]);
    });
});

describe('addressing buttons', () => {
    test('uses Note On for grid buttons', async () => {
        await pad.col(pad.red, [3, 5]);
        assert.deepEqual(out.last, [0x90, 0x10 * 5 + 3, 3]);
    });

    test('uses Note On for scene buttons', async () => {
        await pad.col(pad.green, [8, 4]);
        assert.deepEqual(out.last, [0x90, 0x10 * 4 + 8, 48]);
    });

    test('uses Control Change for automap buttons', async () => {
        await pad.col(pad.green, [2, 8]);
        assert.deepEqual(out.last, [0xb0, 0x68 + 2, 48]);
    });

    test('ignores the non-existent (8,8) corner', async () => {
        const result = await pad.col(pad.red, [8, 8]);
        assert.equal(result, false);
        assert.equal(out.sent.length, 0);
    });

    test('accepts a raw numeric colour code', async () => {
        await pad.col(0, [0, 0]);
        assert.deepEqual(out.last, [0x90, 0, 0]);
    });

    test('sets several buttons from an array', async () => {
        await pad.col(pad.red, [[0, 0], [1, 0], [2, 0]]);
        assert.equal(out.sent.length, 3);
        assert.deepEqual(out.sent.map(m => m[1]), [0, 1, 2]);
    });
});

describe('setColors', () => {
    test('applies a different colour per button', async () => {
        await pad.setColors([[0, 0, pad.red], [1, 0, pad.green]]);
        assert.deepEqual(out.sent, [[0x90, 0, 3], [0x90, 1, 48]]);
    });
});

describe('setSingleButtonColor', () => {
    test('reports whether the coordinate exists', () => {
        assert.equal(pad.setSingleButtonColor([0, 0], pad.red), true);
        assert.equal(pad.setSingleButtonColor([8, 8], pad.red), false);
    });
});

describe('key events', () => {
    test('reports a grid press', () => {
        const seen = [];
        pad.on('key', k => seen.push(k));

        input.receive(gridMessage(3, 5, true));

        assert.equal(seen.length, 1);
        assert.equal(seen[0].x, 3);
        assert.equal(seen[0].y, 5);
        assert.equal(seen[0].pressed, true);
    });

    test('reports a release', () => {
        const seen = [];
        pad.on('key', k => seen.push(k));

        input.receive(gridMessage(3, 5, true));
        input.receive(gridMessage(3, 5, false));

        assert.equal(seen.length, 2);
        assert.equal(seen[1].pressed, false);
    });

    test('reports an automap press at y=8', () => {
        const seen = [];
        pad.on('key', k => seen.push(k));

        input.receive(automapMessage(2, true));

        assert.deepEqual([seen[0].x, seen[0].y], [2, 8]);
    });

    test('carries a stable id for the button', () => {
        const seen = [];
        pad.on('key', k => seen.push(k));

        input.receive(gridMessage(1, 1, true));
        input.receive(gridMessage(1, 1, false));

        assert.equal(typeof seen[0].id, 'symbol');
        assert.equal(seen[0].id, seen[1].id);
    });

    test('is array-like, so it can be fed back to col()', async () => {
        let event;
        pad.on('key', k => { event = k; });
        input.receive(gridMessage(3, 5, true));

        assert.equal(event.length, 2);
        assert.deepEqual([event[0], event[1]], [3, 5]);

        out.reset();
        await pad.col(pad.red, event);
        assert.deepEqual(out.last, [0x90, 0x10 * 5 + 3, 3]);
    });

    test('ignores a callback that is not a function', () => {
        assert.doesNotThrow(() => pad.on('key', 'not a function'));
        assert.doesNotThrow(() => input.receive(gridMessage(0, 0, true)));
    });

    test('delivers to every registered handler', () => {
        let a = 0, b = 0;
        pad.on('key', () => a++);
        pad.on('key', () => b++);

        input.receive(gridMessage(0, 0, true));

        assert.equal(a, 1);
        assert.equal(b, 1);
    });
});

describe('press state', () => {
    test('tracks which buttons are held', () => {
        input.receive(gridMessage(0, 0, true));
        input.receive(gridMessage(3, 5, true));

        assert.equal(pad.isPressed([0, 0]), true);
        assert.equal(pad.isPressed([3, 5]), true);
        assert.equal(pad.isPressed([1, 1]), false);
    });

    test('clears the state on release', () => {
        input.receive(gridMessage(0, 0, true));
        input.receive(gridMessage(0, 0, false));

        assert.equal(pad.isPressed([0, 0]), false);
    });

    test('lists pressed buttons as coordinate pairs', () => {
        input.receive(gridMessage(0, 0, true));
        input.receive(gridMessage(3, 5, true));

        const pressed = pad.pressedButtons.map(([x, y]) => [x, y]);
        assert.deepEqual(pressed.sort(), [[0, 0], [3, 5]]);
    });

    test('starts with nothing pressed', () => {
        assert.deepEqual(pad.pressedButtons, []);
    });
});

describe('fromMap', () => {
    test('selects the buttons marked with x', () => {
        const topRow = pad.fromMap('xxxxxxxx.' + '.........'.repeat(8));
        assert.equal(topRow.length, 8);
        for (const [, y] of topRow) {
            assert.equal(y, 0);
        }
    });

    test('reads the ninth column as scene buttons', () => {
        const scene = pad.fromMap('........x' + '.........'.repeat(8));
        assert.deepEqual([scene[0][0], scene[0][1]], [8, 0]);
    });

    test('reads the ninth row as automap buttons', () => {
        const automap = pad.fromMap('.........'.repeat(8) + 'x........');
        assert.deepEqual([automap[0][0], automap[0][1]], [0, 8]);
    });

    test('selects nothing for an empty map', () => {
        assert.deepEqual(pad.fromMap('.........'.repeat(9)), []);
    });

    test('ignores characters other than lowercase x', () => {
        assert.deepEqual(pad.fromMap('X-o#*....' + '.........'.repeat(8)), []);
    });
});

describe('brightness', () => {
    test('multiplexing sends a duty cycle command', () => {
        pad.multiplexing(1, 5);
        assert.equal(out.last[0], 0xb0);
        assert.ok(out.last[1] === 0x1e || out.last[1] === 0x1f);
    });

    test('multiplexing clamps its arguments', () => {
        assert.doesNotThrow(() => pad.multiplexing(0, 0));
        assert.doesNotThrow(() => pad.multiplexing(99, 99));
    });

    test('brightness sends a duty cycle for any level between 0 and 1', () => {
        for (const level of [0, 0.25, 0.5, 0.75, 1]) {
            out.reset();
            pad.brightness(level);
            assert.equal(out.last[0], 0xb0, `no command sent for brightness ${level}`);
        }
    });
});

describe('sendRaw', () => {
    test('passes bytes through untouched', () => {
        pad.sendRaw([0xb0, 0x00, 0x7f]);
        assert.deepEqual(out.last, [0xb0, 0x00, 0x7f]);
    });
});

describe('connect', () => {
    test('rejects when the browser has no Web MIDI API', async () => {
        const { restore } = withFakeBrowser({ supported: false });
        try {
            await assert.rejects(() => new Launchpad().connect());
        } finally {
            restore();
        }
    });

    test('finds ports whose name contains Launchpad', async () => {
        const midiIn = new FakeMidiInput('Launchpad Mini MIDI 1');
        const midiOut = new FakeMidiOutput();
        midiOut.name = 'Launchpad Mini MIDI 1';

        const { restore, events } = withFakeBrowser({
            inputs: [{ name: 'Some other device' }, midiIn],
            outputs: [midiOut]
        });
        try {
            const fresh = new Launchpad();
            await fresh.connect();
            assert.equal(fresh.midiIn, midiIn);
            assert.equal(fresh.midiOut, midiOut);
            assert.equal(events.length, 1, 'should dispatch a connect event');
        } finally {
            restore();
        }
    });

    test('routes incoming messages after connecting', async () => {
        const midiIn = new FakeMidiInput('Launchpad Mini');
        const midiOut = new FakeMidiOutput();
        midiOut.name = 'Launchpad Mini';

        const { restore } = withFakeBrowser({ inputs: [midiIn], outputs: [midiOut] });
        try {
            const fresh = new Launchpad();
            await fresh.connect();

            let event;
            fresh.on('key', k => { event = k; });
            midiIn.receive(gridMessage(2, 2, true));

            assert.deepEqual([event.x, event.y], [2, 2]);
        } finally {
            restore();
        }
    });
});

// ---------------------------------------------------------------------------
// Known defects. These assert the behaviour the library *should* have.
// See CHANGELOG.md and the Known limitations section of the README.
// ---------------------------------------------------------------------------

describe('known defects', () => {
    // `color.code || color` treats the valid code 0 as falsy and falls through
    // to the Color object, which is then sent as a MIDI data byte.
    test('pad.off turns an LED off',
        { todo: 'col() resolves colours with `color.code || color`, and 0 is falsy' },
        async () => {
            await pad.col(pad.off, [0, 0]);
            assert.deepEqual(out.last, [0x90, 0, 0]);
        });

    test('a zero-brightness colour turns an LED off',
        { todo: 'same falsy-zero defect as pad.off' },
        async () => {
            await pad.col(pad.red.off, [0, 0]);
            assert.deepEqual(out.last, [0x90, 0, 0]);
        });

    test('setSingleButtonColor accepts pad.off',
        { todo: 'same falsy-zero defect as pad.off' },
        () => {
            pad.setSingleButtonColor([0, 0], pad.off);
            assert.deepEqual(out.last, [0x90, 0, 0]);
        });

    // A helper named `or` was lost in the port from launchpad-mini, and all
    // four buffer members reference it.
    test('setBuffers selects the write buffer',
        { todo: 'setBuffers references an undefined helper `or`' },
        () => {
            pad.setBuffers({ write: 1 });
            assert.equal(pad.writeBuffer, 1);
        });

    test('the writeBuffer setter works',
        { todo: 'writeBuffer setter references an undefined helper `or`' },
        () => {
            pad.writeBuffer = 1;
            assert.equal(pad.writeBuffer, 1);
        });

    test('the displayBuffer setter works',
        { todo: 'displayBuffer setter references an undefined helper `or`' },
        () => {
            pad.displayBuffer = 1;
            assert.equal(pad.displayBuffer, 1);
        });

    test('the flash setter works',
        { todo: 'flash setter references an undefined helper `or`' },
        () => {
            pad.flash = true;
            assert.equal(out.last[0], 0xb0);
        });

    // _button() returns undefined for (8,8), and the handler dereferences it.
    test('an unmapped MIDI message does not throw',
        { todo: '_processMessage dereferences an undefined button for (8,8)' },
        () => {
            assert.doesNotThrow(() => input.receive([0x90, 0x88, 127]));
        });

    // fromPattern composes decodeString with byXy, but the pair order disagrees.
    test('fromPattern selects the requested row',
        { todo: 'rN decodes to a column; see spec/buttons.test.js' },
        () => {
            const row = pad.fromPattern('r4:xxx');
            for (const [, y] of row) {
                assert.equal(y, 4);
            }
        });

    test('fromPattern returns the same shape for a string and an array',
        { todo: 'the array branch skips the byXy lookup the string branch applies' },
        () => {
            // Both branches happen to yield the same numbers, so comparing
            // coordinates proves nothing. The difference is the type: the
            // string branch resolves through byXy and carries a button id,
            // the array branch hands back raw pairs.
            const single = pad.fromPattern('r4:xxx');
            const asArray = pad.fromPattern(['r4:xxx']);

            assert.equal(typeof single[0].id, 'symbol', 'string branch should resolve buttons');
            assert.equal(typeof asArray[0].id, 'symbol', 'array branch should resolve buttons too');
        });

    // connect() builds a MidiAdapter from undefined ports, then dereferences it.
    test('connect reports a missing device clearly',
        { todo: 'connect() throws a TypeError about onmidimessage instead' },
        async () => {
            const { restore } = withFakeBrowser({ inputs: [], outputs: [] });
            try {
                await assert.rejects(
                    () => new Launchpad().connect(),
                    (err) => /launchpad|not found|no device/i.test(String(err.message ?? err))
                );
            } finally {
                restore();
            }
        });
});
