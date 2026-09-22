# API reference

Complete reference for `launchpad-webmidi`. For installation, browser support
and a gentler introduction, see the [README](../README.md).

Every method documented here works. The defects listed in earlier releases were
fixed in 1.3.0 and 2.0.0; see the [changelog](../CHANGELOG.md).

## Contents

- [Importing](#importing)
- [`Launchpad`](#launchpad)
  - [`new Launchpad()`](#new-launchpad)
  - [`connect()`](#connect)
  - [`reset(brightness)`](#resetbrightness)
  - [`col(color, buttons)`](#colcolor-buttons)
  - [`setColors(buttonsWithColor)`](#setcolorsbuttonswithcolor)
  - [`setSingleButtonColor(xy, color)`](#setsinglebuttoncolorxy-color)
  - [`isPressed(button)`](#ispressedbutton)
  - [`pressedButtons`](#pressedbuttons)
  - [`fromMap(map)`](#frommapmap)
  - [`fromPattern(pattern)`](#frompatternpattern)
  - [`brightness(brightness)`](#brightnessbrightness)
  - [`multiplexing(num, den)`](#multiplexingnum-den)
  - [`sendRaw(data)`](#sendrawdata)
  - [Double buffering](#double-buffering)
- [Events](#events)
- [The colour model](#the-colour-model)
- [Coordinates](#coordinates)

## Importing

The package has a **single default export**, the `Launchpad` class:

```js
import Launchpad from 'launchpad-webmidi';
```

The internal `Color` class and the `Buttons` collection are *not* exported. You
reach colours through the instance properties (`pad.red` and friends) and
coordinates through plain `[x, y]` arrays.

## `Launchpad`

Extends an internal `Observable`, which supplies [`on()`](#events).

### `new Launchpad()`

Creates an instance. Does no I/O – nothing touches MIDI until you call
[`connect()`](#connect).

```js
const pad = new Launchpad();
```

The constructor exposes the five predefined colours as properties: `pad.red`,
`pad.green`, `pad.amber`, `pad.yellow`, `pad.off`. See
[the colour model](#the-colour-model).

### `connect()`

Requests Web MIDI access, finds the first input and output port whose name
contains `Launchpad`, and starts listening for button presses.

**Returns** `Promise<void>` – resolves once the device is wired up.

```js
await pad.connect();
```

Rejects if the browser has no Web MIDI API, or if the user denies the permission
prompt. It also dispatches a `connect` [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)
on `window`, whose `detail` is the string `'Launchpad connected'`:

```js
window.addEventListener('connect', e => console.log(e.detail));
```

Port matching is by name only and there is no way to select a specific device,
so with two Launchpads connected you get whichever the browser lists first.

When no matching port is found, the promise rejects with
`No Launchpad found among the available MIDI ports`.

### `reset(brightness)`

Resets mapping mode, buffer settings and duty cycle, then turns every LED on or
off.

| Parameter | Type | Description |
| --- | --- | --- |
| `brightness` | `Number` *(optional)* | `1` low, `2` medium, `3` full. Any other value – including omitting it – turns all LEDs **off**. |

```js
pad.reset();     // all LEDs off
pad.reset(2);    // all LEDs medium-brightness yellow
```

### `col(color, buttons)`

Sets the colour of one button or many. The workhorse of the library.

| Parameter | Type | Description |
| --- | --- | --- |
| `color` | `Color \| Number` | A predefined colour, or a raw MIDI colour code |
| `buttons` | `[x, y] \| Array<[x, y]>` | One coordinate pair, or an array of them |

**Returns** `Promise` – for a single button, resolves to a `Boolean` saying
whether the coordinate existed. For an array, resolves once the data has been
queued.

```js
pad.col(pad.red, [0, 0]);                      // one button
pad.col(pad.green, [[0, 0], [1, 1], [2, 2]]);  // several
pad.col(pad.amber, pad.fromMap(map));          // from a painted map
```

Because the [`key` event payload](#events) is array-like, you can feed it
straight back:

```js
pad.on('key', k => pad.col(pad.red, k));
```

Coordinates outside the grid are ignored and resolve to `false`.

Switching an LED off works with either form:

```js
pad.col(pad.off, [0, 0]);
pad.col(pad.red.off, [0, 0]);
pad.col(0, [0, 0]);
```

### `setColors(buttonsWithColor)`

Sets several buttons to individually chosen colours in one call.

| Parameter | Type | Description |
| --- | --- | --- |
| `buttonsWithColor` | `Array<[x, y, color]>` | Triples of coordinate and colour |

**Returns** `Promise` – resolves once the data has been queued.

```js
pad.setColors([
    [0, 0, pad.red],
    [1, 0, pad.green],
    [2, 0, pad.amber.low]
]);
```

### `setSingleButtonColor(xy, color)`

The synchronous single-button counterpart of `col()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `xy` | `[x, y]` | Button coordinates |
| `color` | `Color \| Number` | Colour to apply |

**Returns** `Boolean` – whether the coordinate existed.

```js
pad.setSingleButtonColor([3, 4], pad.green);
```

### `isPressed(button)`

Tests whether a button is currently held down.

| Parameter | Type | Description |
| --- | --- | --- |
| `button` | `[x, y]` | Button coordinates |

**Returns** `Boolean`

```js
if (pad.isPressed([0, 0])) { /* … */ }
```

Press state is only tracked once [`connect()`](#connect) has resolved.

### `pressedButtons`

**Read-only property.** Every button currently held down.

**Returns** `Array<[x, y]>`

```js
console.log(pad.pressedButtons);   // e.g. [ [0,0], [3,5] ]
```

### `fromMap(map)`

Turns a "painted" picture of the whole device into coordinates. The input is 81
characters covering the 9×9 addressable space, row by row. Every lowercase `x`
selects that button; every other character is ignored.

| Parameter | Type | Description |
| --- | --- | --- |
| `map` | `String` | 81 characters, 9 rows of 9 |

**Returns** `Array<[x, y]>`

Rows 0–7 are the grid rows, each followed by its scene button in column 8. Row 8
is the Automap row – which is physically at the *top* of the device, so the map
reads upside-down relative to the hardware.

```js
const border = pad.fromMap(
    'xxxxxxxx.' +   // y = 0, top grid row (9th char is the scene button)
    'x......x.' +   // y = 1
    'x......x.' +
    'x......x.' +
    'x......x.' +
    'x......x.' +
    'x......x.' +
    'xxxxxxxx.' +   // y = 7
    '.........'     // y = 8, Automap row
);

pad.col(pad.amber, border);
```

The 81st character maps to `(8, 8)`, which has no button; marking it yields an
`undefined` entry, so leave it blank.

### `fromPattern(pattern)`

Converts a compact row or column description into coordinates.

| Parameter | Type | Description |
| --- | --- | --- |
| `pattern` | `String \| Array<String>` | `'mod:pattern'`, or an array of them |

**Returns** `Array<[x, y]>`

The modifier `mod` is one of `rN` (row N), `cN` (column N), `am` (Automap) or
`sc` (Scene). In `pattern`, `x` or `X` selects a button and any other character
is ignored.

```js
pad.col(pad.red, pad.fromPattern('r0:xxxxxxxx'));   // the top grid row
pad.col(pad.green, pad.fromPattern('c0:xxxxxxxx')); // the leftmost column
pad.col(pad.amber, pad.fromPattern('sc:x..x'));     // two scene buttons
pad.col(pad.yellow, pad.fromPattern('am:xx'));      // two automap buttons
```

An array merges several patterns and removes duplicates:

```js
pad.fromPattern(['r0:xx', 'c0:xx']);   // (0,0) (1,0) (0,1)
```

The first character of the pattern is the position-8 overflow, so `'r2x'`
selects `(8, 2)` rather than `(0, 2)`. Separating the modifier from the pattern
with any ignored character – `:` by convention – avoids the surprise.

An unrecognised modifier selects nothing, and the non-existent `(8, 8)` corner
is dropped from the result.

> **Changed in 2.0.0** – `rN` previously returned a column and `cN` a row, and
> the array form returned raw pairs rather than resolved buttons. `sc` and `am`
> are unaffected.

### `brightness(brightness)`

Sets the brightness of non-full-brightness LEDs. Lower values raise contrast,
since full-brightness buttons are unaffected.

| Parameter | Type | Description |
| --- | --- | --- |
| `brightness` | `Number` | `0` darkest to `1` brightest |

```js
pad.brightness(0.4);
```

A convenience wrapper that picks the closest duty cycle and calls
[`multiplexing()`](#multiplexingnum-den).

### `multiplexing(num, den)`

Sets the LED duty cycle directly, as the fraction `num/den`. Low-brightness LEDs
end up roughly that fraction as bright as full-brightness ones; medium is twice
low.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `num` | `Number` | `1` | Numerator, clamped to 1–16 |
| `den` | `Number` | `5` | Denominator, clamped to 3–18 |

```js
pad.multiplexing(1, 5);
```

Prefer [`brightness()`](#brightnessbrightness) unless you need an exact cycle.

### `sendRaw(data)`

Sends raw bytes to the Launchpad's MIDI output – the escape hatch for anything
the library does not wrap.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `Array<Number>` | MIDI message bytes |

```js
pad.sendRaw([0xb0, 0x00, 0x00]);   // reset
```

Only valid after [`connect()`](#connect) has resolved.

### Double buffering

The Launchpad has two LED buffers, letting you compose a frame off-screen and
swap it in, or alternate the two to flash.

| Member | Behaviour |
| --- | --- |
| `setBuffers({ write, display, copyToDisplay, flash })` | Configure both buffers at once |
| `writeBuffer` | Get, or set, the buffer LED writes go to (`0` or `1`) |
| `displayBuffer` | Get, or set, the buffer shown on the device. Setting it also disables flashing |
| `flash` | Set to `true` to alternate the display buffer automatically |

```js
pad.writeBuffer = 1;        // draw into the hidden buffer
pad.col(pad.red, [0, 0]);
pad.displayBuffer = 1;      // swap it in

pad.flash = true;           // or let the device alternate them
```

Both buffers default to 0.

> **Note** – these members were broken in every release up to 1.2.0, throwing
> `ReferenceError: or is not defined`. Fixed in 1.3.0.

## Events

Subscribe with `on(event, callback)`. There is no `off()` – handlers cannot be
removed once registered.

### `key`

Fired on every press **and** every release.

```js
pad.on('key', k => {
    console.log(`(${k.x}, ${k.y}) is ${k.pressed ? 'down' : 'up'}`);
});
```

The payload:

| Property | Type | Description |
| --- | --- | --- |
| `x` | `Number` | Column, 0–8 |
| `y` | `Number` | Row, 0–8 |
| `pressed` | `Boolean` | `true` on press, `false` on release |
| `id` | `Symbol` | Stable identity for this button |
| `0`, `1`, `length` | | Array-like shape, so the payload can be passed straight to `col()` |

That last row is the useful trick – the payload pretends to be an `[x, y]` pair:

```js
pad.on('key', k => pad.col(k.pressed ? pad.red : pad.green, k));
```

## The colour model

The Launchpad Mini has one red and one green LED per button. Everything in the
palette comes from mixing those two at four levels each.

### Predefined colours

Available as properties on the instance:

| Colour | Description |
| --- | --- |
| `pad.red` | Red only |
| `pad.green` | Green only |
| `pad.amber` | Red and green at equal levels |
| `pad.yellow` | A fixed red/green ratio. Full brightness only |
| `pad.off` | LED off |

All are full brightness by default.

### Brightness

Every colour carries a level from 0 to 3:

```js
pad.red.off       // level 0
pad.red.low       // level 1
pad.red.medium    // level 2
pad.red.full      // level 3, same as pad.red
pad.red.level(2)  // numeric, clamped and rounded to 0–3
```

**Colours are immutable.** Each accessor returns a *new* `Color`, so `pad.red`
stays full-brightness red no matter what you derive from it.

**Yellow has only one brightness.** Its code hard-codes the red/green pair
needed to read as yellow, which leaves no room to encode a level. `yellow.low`,
`yellow.medium` and `yellow.full` all produce the same code – a hardware
limitation, not an oversight.

### Buffer modifiers

Two modifiers say what should happen in the *other* LED buffer. They pair with
[double buffering](#double-buffering).

| Modifier | Effect on the other buffer |
| --- | --- |
| `.clear` | Turn the LED off |
| `.copy` | Use the same colour. Overrides `.clear` |
| *(neither)* | Leave the other buffer untouched |

```js
pad.red.clear    // red here, dark in the other buffer
pad.red.copy     // red in both buffers
```

### MIDI codes

`color.code` is the raw byte sent to the device. The layout is:

```
 bit  6   5   4   3   2   1   0
      -   g   g   c   C   r   r
                  │   └── copy
                  └────── clear
```

Green occupies bits 4–5, red bits 0–1, each holding a level of 0–3.

Resolved codes for the predefined colours, without modifiers:

| Colour | `.off` | `.low` | `.medium` | `.full` |
| --- | --- | --- | --- | --- |
| `red` | 0 | 1 | 2 | 3 |
| `green` | 0 | 16 | 32 | 48 |
| `amber` | 0 | 17 | 34 | 51 |
| `yellow` | 0 | 50 | 50 | 50 |
| `off` | 0 | 0 | 0 | 0 |

`.clear` adds 8 and `.copy` adds 4. You can pass any of these numbers to
[`col()`](#colcolor-buttons) directly instead of a `Color`:

```js
pad.col(0, [0, 0]);    // same as pad.col(pad.off, [0, 0])
```

## Coordinates

Buttons are `[x, y]` pairs. `x` runs left to right, `y` top to bottom, both from
0. See [the diagram in the README](../README.md#button-layout-and-coordinates)
for the physical arrangement.

| Group | Coordinates | Count | Physical location |
| --- | --- | --- | --- |
| Grid | `x` 0–7, `y` 0–7 | 64 | The 8×8 square of square buttons |
| Scene | `x` = 8, `y` 0–7 | 8 | Round buttons down the right side |
| Automap / Live | `y` = 8, `x` 0–7 | 8 | Round buttons along the top |

**80 buttons, not 81.** `(8, 8)` would be the top-right corner, where the
Automap row meets the Scene column – there is no button there on the hardware,
so the coordinate does not resolve. `col()` ignores it, and `fromMap()` returns
`undefined` for it.

**`y = 8` is the top row.** Automap buttons sit above `y = 0` on the device
despite holding the highest `y`. The convention came from `launchpad-mini` and
was kept so existing code ports unchanged.

Internally the two families use different MIDI messages – Note On (`0x90`) for
grid and scene, Control Change (`0xb0`) for Automap. You only need this for
[`sendRaw()`](#sendrawdata):

```
grid & scene:  [ 0x90, 0x10 * y + x, colorCode ]
automap:       [ 0xb0, 0x68 + x,     colorCode ]
```
