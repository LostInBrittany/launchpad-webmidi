# Launchpad WebMIDI

[![npm version](https://img.shields.io/npm/v/launchpad-webmidi.svg)](https://www.npmjs.com/package/launchpad-webmidi)
[![license](https://img.shields.io/npm/l/launchpad-webmidi.svg)](./LICENCE.md)

Drive a Novation Launchpad Mini straight from the browser, using the
[Web MIDI API](https://webaudio.github.io/web-midi-api/) – no server, no native
module, no build step required.

```js
import Launchpad from 'launchpad-webmidi';

const pad = new Launchpad();
await pad.connect();

pad.reset(2);                       // every LED to medium-brightness yellow
pad.on('key', k => {
    pad.col(k.pressed ? pad.red : pad.green, k);
});
```

**Full API reference: [docs/API.md](docs/API.md)**

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Choosing a build](#choosing-a-build)
- [Getting started](#getting-started)
- [Button layout and coordinates](#button-layout-and-coordinates)
- [Colours](#colours)
- [Examples](#examples)
- [Coming from launchpad-mini](#coming-from-launchpad-mini)
- [Known limitations](#known-limitations)
- [Changelog](#changelog)
- [Licence](#licence)

## Requirements

A Novation Launchpad Mini (or a device whose MIDI port name contains
`Launchpad`), and a browser that implements the Web MIDI API.

**Browser support** is the real constraint here, so it's worth being precise:

| Browser | Support |
| --- | --- |
| Chrome | 43+ |
| Edge | 79+ |
| Opera | 30+ |
| Chrome for Android | 152+ |
| Firefox | 108+, but see the caveat below |
| Safari (macOS and iOS) | Not supported |

Two things will bite you:

**The page must be a secure context.** `navigator.requestMIDIAccess()` is only
exposed over HTTPS or on `localhost`. Opening an example straight from the
filesystem with `file://` will not work – serve it instead:

```bash
npx serve .    # then open http://localhost:3000/examples/basic-with-esm.html
```

**Chrome 124 and later always prompt for permission.** Permission used to be
required only for SysEx messages; it now covers all MIDI access. Your users will
see a prompt on the first `connect()`, and `connect()` rejects if they decline.

**Firefox needs a site-permission add-on.** Although Firefox has shipped Web MIDI
since 108, `requestMIDIAccess()` rejects on every origin except `localhost`
unless the user has installed a site-specific `.xpi` add-on that you host
yourself. Firefox cannot distinguish "add-on missing" from "user said no", so
neither can this library. In practice, treat Firefox as unsupported unless you
are prepared to ship an add-on.

If your page is embedded in an iframe, the parent must also grant MIDI through
the [`Permissions-Policy: midi`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy/midi)
header.

## Installation

```bash
npm install launchpad-webmidi
```

```bash
yarn add launchpad-webmidi
```

Or drop a build straight into a page from a CDN:

```html
<script type="module">
    import Launchpad from 'https://unpkg.com/launchpad-webmidi/dist/launchpad-webmidi.es.js';
</script>
```

## Choosing a build

Rollup produces three bundles from the same source. They differ only in how they
expose the `Launchpad` class.

| File | Format | How you get `Launchpad` | Use when |
| --- | --- | --- | --- |
| `dist/launchpad-webmidi.es.js` | ES module | `import Launchpad from …` (default export) | Almost always. Any modern bundler, or a plain `<script type="module">` |
| `dist/launchpad-webmidi.umd.js` | UMD | global `Launchpad`, or AMD/CommonJS | You need AMD, or a global from a plain `<script>` |
| `dist/launchpad-webmidi.js` | IIFE | global `Launchpad` | A plain `<script>` tag and nothing else |

Prefer the ES module build unless you have a specific reason not to.

## Getting started

### With ES modules

```html
<script type="module">
    import Launchpad from '../dist/launchpad-webmidi.es.js';

    const pad = new Launchpad();

    pad.connect().then(() => {
        pad.reset(2);

        pad.on('key', k => {
            console.log(`Key ${k.x},${k.y} down: ${k.pressed}`);
            // Amber while held, green once released
            pad.col(k.pressed ? pad.amber : pad.green, k);
        });
    }).catch(err => {
        console.error('Could not reach the Launchpad:', err);
    });
</script>
```

### With a global build

```html
<script src="../dist/launchpad-webmidi.umd.js"></script>
<script>
    const pad = new Launchpad();
    pad.connect().then(() => pad.reset(2));
</script>
```

### Lighting specific buttons

The `key` event object doubles as an `[x, y]` pair, so it can be handed straight
back to `col()`. You can also address buttons explicitly:

```js
pad.col(pad.red, [0, 0]);                      // one button
pad.col(pad.green, [[0, 0], [1, 0], [2, 0]]);  // several at once

// A whole row, described as a string
pad.col(pad.amber, pad.fromMap(
    'xxxxxxxx.' +
    '.........' +
    '.........' +
    '.........' +
    '.........' +
    '.........' +
    '.........' +
    '.........' +
    '.........'
));
```

## Button layout and coordinates

Every button is addressed as an `[x, y]` pair. `x` runs left to right, `y` runs
**top to bottom**, both starting at 0.

```
            Automap / Live buttons          y = 8
        (0,8)(1,8)(2,8)(3,8)(4,8)(5,8)(6,8)(7,8)
         ○    ○    ○    ○    ○    ○    ○    ○

        ┌────┬────┬────┬────┬────┬────┬────┬────┐
 y = 0  │ 0,0│ 1,0│ 2,0│ 3,0│ 4,0│ 5,0│ 6,0│ 7,0│  ○ (8,0)  ┐
        ├────┼────┼────┼────┼────┼────┼────┼────┤           │
 y = 1  │ 0,1│ 1,1│ 2,1│ 3,1│ 4,1│ 5,1│ 6,1│ 7,1│  ○ (8,1)  │
        ├────┼────┼────┼────┼────┼────┼────┼────┤           │  Scene
  ...   │  · │  · │  · │  · │  · │  · │  · │  · │  ○  ...   │  buttons
        ├────┼────┼────┼────┼────┼────┼────┼────┤           │  x = 8
 y = 7  │ 0,7│ 1,7│ 2,7│ 3,7│ 4,7│ 5,7│ 6,7│ 7,7│  ○ (8,7)  ┘
        └────┴────┴────┴────┴────┴────┴────┴────┘
                    8 × 8 grid
```

Three groups, matching the three kinds of button on the hardware:

- **Grid** – the 64 square buttons, `x` and `y` both 0–7.
- **Scene** – the 8 round buttons down the right-hand side, `x = 8`, `y` 0–7.
- **Automap / Live** – the 8 round buttons along the top, `y = 8`, `x` 0–7.

Two quirks are worth internalising, because they trip everyone up:

**`y = 8` is physically the top row.** The Automap buttons sit *above* row
`y = 0` on the device, even though they carry the highest `y`. The coordinate
system was inherited from `launchpad-mini` and kept for compatibility.

**There are 80 buttons, not 81.** The corner position `(8, 8)` – top-right,
where the Automap row and the Scene column would meet – has no button on the
hardware, so it does not exist in the coordinate space either. Passing `[8, 8]`
to `col()` is a no-op that resolves to `false`.

Under the hood the two families speak different MIDI dialects: grid and scene
buttons use Note On (`0x90`), Automap buttons use Control Change (`0xb0`). The
library hides this, but it explains why `y = 8` is special-cased everywhere.

## Colours

The Launchpad Mini has red and green LEDs per button. Mixing them gives amber,
and a fixed red/green ratio gives yellow – that is the entire palette.

Five colours are available as properties on the pad:

```js
pad.red
pad.green
pad.amber
pad.yellow
pad.off
```

Each is a `Color` object, and each has three brightness levels:

```js
pad.col(pad.red.low, [0, 0]);
pad.col(pad.red.medium, [1, 0]);
pad.col(pad.red.full, [2, 0]);   // same as pad.red
```

Colours are immutable – `.low` returns a *new* `Color` rather than modifying the
original, so `pad.red` is always full-brightness red.

Switch an LED off with `pad.off`, or by passing the raw code `0`:

```js
pad.col(pad.off, [0, 0]);
pad.col(0, [0, 0]);      // equivalent
```

See [the Colour model in the API reference](docs/API.md#the-colour-model) for
double-buffering modifiers, the MIDI encoding, and why yellow only has one
brightness.

## Examples

Runnable pages live in [`examples/`](examples/). Serve the repository over HTTP
and open them – remember that `file://` will not work.

| Example | What it shows |
| --- | --- |
| [`basic-with-esm.html`](examples/basic-with-esm.html) | Minimal connect-and-react loop, ES modules |
| [`basic-with-umd.html`](examples/basic-with-umd.html) | The same, via the UMD global |
| [`switch-color-with-esm.html`](examples/switch-color-with-esm.html) | Per-button colour state that cycles on each press |
| [`switch-color-with-umd.html`](examples/switch-color-with-umd.html) | The same, via the UMD global |

## Coming from launchpad-mini

This library began as a port of
[launchpad-mini](https://github.com/Granjow/launchpad-mini/), Simon Eugster's
Node library for the same hardware. Most of the API is unchanged, so existing
code often ports with only the connection code rewritten.

**What changed:**

| | launchpad-mini | launchpad-webmidi |
| --- | --- | --- |
| Runtime | Node.js | Browser |
| MIDI backend | the native [`midi`](https://www.npmjs.com/package/midi) module | Web MIDI API |
| Modules | CommonJS (`require`) | ES modules (`import`) |
| Import | `const Launchpad = require('launchpad-mini')` | `import Launchpad from 'launchpad-webmidi'` |
| Connecting | `pad.connect()` → promise, optional port name | `pad.connect()` → promise, auto-detect only |
| Permissions | none | secure context plus a browser permission prompt |

**What stayed the same:** the `[x, y]` coordinate system, the `Color` model and
its brightness levels, `col()`, `setColors()`, `reset()`, `isPressed()`,
`pressedButtons`, `fromMap()`, `brightness()`, `multiplexing()`, and the `key`
event and its array-like payload.

**What was dropped:** port selection by name or index, and everything in
`launchpad-mini` that depended on Node APIs.

## Known limitations

One defect remains in the current release, confirmed by running the code. It is
documented here rather than quietly omitted, and flagged again at the relevant
place in [the API reference](docs/API.md).

- **`fromPattern()` mixes up rows and columns.** `fromPattern('r4:xxx')` yields
  column 4 rather than row 4, and `cN` likewise yields a row. Scene (`sc`) and
  Automap (`am`) patterns decode correctly. It also returns a different shape
  for a single string than for an array of strings. The fix changes public
  behaviour, so it is scheduled for 2.0.0 –
  [#15](https://github.com/LostInBrittany/launchpad-webmidi/issues/15),
  [#16](https://github.com/LostInBrittany/launchpad-webmidi/issues/16). Use
  [`fromMap()`](docs/API.md#frommapmap) in the meantime.

Everything else previously listed here was fixed in 1.3.0: `pad.off` now turns
LEDs off, double buffering and flashing work, the message handler no longer
throws on unmapped coordinates, `connect()` names a missing device, the library
is quiet by default, and the package declares itself correctly for npm. See the
[changelog](CHANGELOG.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Licence

[MIT](./LICENCE.md)
