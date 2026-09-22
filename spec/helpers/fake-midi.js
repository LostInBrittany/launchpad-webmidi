/**
 * Test helpers for driving a Launchpad without hardware.
 *
 * The library talks to exactly two things: a MIDI output it calls `.send()` on,
 * and a MIDI input that calls `.onmidimessage`. Both are trivial to stand in
 * for, so these helpers use real library code throughout — nothing here mocks
 * the code under test.
 */

/** A MIDI output port that records what was sent to it. */
export class FakeMidiOutput {
    constructor() {
        this.sent = [];
    }

    send(data) {
        // A real MIDIOutput rejects anything that is not a sequence of bytes.
        // Reproducing that is the whole point: it is how `pad.off` fails.
        for (const byte of data) {
            if (typeof byte !== 'number' || !Number.isInteger(byte)) {
                throw new TypeError(
                    `Failed to execute 'send' on 'MIDIOutput': ` +
                    `The value at index ${data.indexOf(byte)} is not an integer.`
                );
            }
        }
        this.sent.push([...data]);
    }

    /** The most recent message, or undefined. */
    get last() {
        return this.sent[this.sent.length - 1];
    }

    reset() {
        this.sent = [];
    }
}

/** A MIDI input port the test can push messages through. */
export class FakeMidiInput {
    constructor(name = 'Launchpad Mini') {
        this.name = name;
        this.onmidimessage = null;
    }

    /** Deliver a raw MIDI message to whoever is listening. */
    receive(data) {
        this.onmidimessage?.({ data });
    }
}

/**
 * Wire a Launchpad instance to fake ports without going through connect().
 * @returns {{ pad: Launchpad, out: FakeMidiOutput, input: FakeMidiInput }}
 */
export function attachFakePorts(pad) {
    const out = new FakeMidiOutput();
    const input = new FakeMidiInput();

    pad.midiOut = out;
    pad.midiIn = input;
    input.onmidimessage = (msg) => pad._processMessage(msg);

    return { pad, out, input };
}

/** Build a Note On message for a grid or scene button. */
export const gridMessage = (x, y, pressed = true) =>
    [0x90, 0x10 * y + x, pressed ? 127 : 0];

/** Build a Control Change message for an Automap button. */
export const automapMessage = (x, pressed = true) =>
    [0xb0, 0x68 + x, pressed ? 127 : 0];

/**
 * Install fake `navigator` and `window` globals so connect() can run in Node,
 * and return a function that restores whatever was there before.
 *
 * @param {{ inputs?: Array, outputs?: Array, supported?: Boolean }} options
 */
export function withFakeBrowser({ inputs = [], outputs = [], supported = true } = {}) {
    const hadNavigator = 'navigator' in globalThis;
    const hadWindow = 'window' in globalThis;
    const previousNavigator = globalThis.navigator;
    const previousWindow = globalThis.window;

    const events = [];

    const navigatorStub = supported
        ? { requestMIDIAccess: () => Promise.resolve({
              inputs: { values: () => inputs[Symbol.iterator]() },
              outputs: { values: () => outputs[Symbol.iterator]() }
          }) }
        : {};

    Object.defineProperty(globalThis, 'navigator', {
        value: navigatorStub, configurable: true, writable: true
    });
    Object.defineProperty(globalThis, 'window', {
        value: { dispatchEvent: (e) => events.push(e) },
        configurable: true, writable: true
    });

    const restore = () => {
        if (hadNavigator) {
            Object.defineProperty(globalThis, 'navigator', {
                value: previousNavigator, configurable: true, writable: true
            });
        } else {
            delete globalThis.navigator;
        }
        if (hadWindow) {
            Object.defineProperty(globalThis, 'window', {
                value: previousWindow, configurable: true, writable: true
            });
        } else {
            delete globalThis.window;
        }
    };

    return { restore, events };
}
