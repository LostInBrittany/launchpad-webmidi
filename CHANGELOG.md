# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] – 2026-09-22

### Changed

- **Breaking.** `fromPattern()` now returns what its modifiers say. `rN`
  selects row N and `cN` selects column N; previously they were swapped, so
  `fromPattern('r4:xxx')` returned column 4. Scene (`sc`) and Automap (`am`)
  patterns are unaffected and return exactly what they did before.

  The cause was two inversions that cancelled out for `sc` and `am` only:
  `asRow()` and `asCol()` both fixed the *first* coordinate, and
  `decodeModifier()` labelled Scene as a row (it is the `x = 8` column) and
  Automap as a column (it is the `y = 8` row).
  ([#15](https://github.com/LostInBrittany/launchpad-webmidi/issues/15))

- **Breaking.** `fromPattern()` returns the same type for both input forms.
  Given an array of patterns it previously returned raw coordinate pairs,
  skipping the lookup the single-string form applied, so the results carried no
  button id. Both forms now return resolved buttons.
  ([#16](https://github.com/LostInBrittany/launchpad-webmidi/issues/16))

- **Breaking, internal.** `asRow()`, `asCol()` and `decodeString()` in
  `lib/buttons.js` now emit `[x, y]` pairs consistently. These are not part of
  the public API – the package exports only the `Launchpad` class – but anyone
  reaching into the source will see the change.

### Fixed

- `fromPattern()` drops the non-existent `(8, 8)` corner instead of returning
  an `undefined` entry. `'scx'` and similar patterns could address it.

### Migrating from 1.3.0

If you use `fromPattern()` with `rN` or `cN`, swap them, or delete a workaround
if you had one:

```js
// Before 2.0.0, to light the top row:
pad.col(pad.red, pad.fromPattern('c0:xxxxxxxx'));

// From 2.0.0:
pad.col(pad.red, pad.fromPattern('r0:xxxxxxxx'));
```

`sc` and `am` patterns, `fromMap()`, and everything else need no changes.

## [1.3.0] – 2026-09-22

### Fixed

- `pad.off` now turns LEDs off. Colours were resolved with
  `color.code || color`, and the valid code `0` is falsy, so the `Color` object
  was sent as a MIDI data byte and `MIDIOutput.send()` threw. Affected `col()`,
  `setColors()`, `setSingleButtonColor()` and any zero-brightness colour.
  ([#5](https://github.com/LostInBrittany/launchpad-webmidi/issues/5))
- Double buffering and flashing work again. `setBuffers()` and the
  `writeBuffer`, `displayBuffer` and `flash` setters referenced a helper named
  `or` that was lost in the port from `launchpad-mini`, and threw
  `ReferenceError: or is not defined`.
  ([#6](https://github.com/LostInBrittany/launchpad-webmidi/issues/6))
- An invalid pattern modifier now decodes to nothing. `getDecoder()` tested
  `mod.err` while `decodeModifier()` reports `{ error: true }`, so the guard
  never fired.
  ([#7](https://github.com/LostInBrittany/launchpad-webmidi/issues/7))
- The MIDI message handler no longer throws on a message resolving to the
  non-existent `(8, 8)` corner.
  ([#8](https://github.com/LostInBrittany/launchpad-webmidi/issues/8))
- `connect()` rejects with `No Launchpad found among the available MIDI ports`
  when no matching device is present, instead of a `TypeError` about
  `onmidimessage`.
  ([#9](https://github.com/LostInBrittany/launchpad-webmidi/issues/9))
- The package declares itself correctly for npm. `require()` now works: the
  `main` entry is a `.cjs` build, so Node no longer tries to parse the UMD
  bundle as ESM. Added an `exports` map and a `files` allowlist, so the
  published package no longer ships `spec/`, `.cache/` or scratch files.
  ([#11](https://github.com/LostInBrittany/launchpad-webmidi/issues/11))

### Changed

- The library is quiet by default. It no longer writes to `console.log` on
  connect or on unrecognised MIDI messages.
  ([#10](https://github.com/LostInBrittany/launchpad-webmidi/issues/10))

### Added

- A working test suite. The three specs inherited from `launchpad-mini` could
  never run – CommonJS `require()` against ESM modules in a `"type": "module"`
  package, with jasmine undeclared and no `test` script. Replaced with Node's
  built-in runner: `npm test` runs the suite with no new dependencies.
- `dist/launchpad-webmidi.umd.cjs`, for `require()`. The existing
  `dist/launchpad-webmidi.umd.js` is unchanged, so `<script src>` and CDN links
  keep working.
- `keywords`, `homepage` and `bugs` metadata.

### Removed

- The dead `MidiAdapterFactory` class, never instantiated and duplicating
  `connect()`.
  ([#12](https://github.com/LostInBrittany/launchpad-webmidi/issues/12))
- A committed build cache, `.cache/117bcfd92e17ff1bcd6565c3ce673b13.json`, now
  gitignored.
  ([#13](https://github.com/LostInBrittany/launchpad-webmidi/issues/13))
- The scratch `index.html` at the repository root, superseded by `examples/`.
  ([#14](https://github.com/LostInBrittany/launchpad-webmidi/issues/14))

## [1.2.1] – 2026-09-22

### Added

- Full API reference in [`docs/API.md`](docs/API.md), covering every public
  member, the `key` event payload, the colour model with its MIDI encoding, and
  the coordinate system.
- This changelog.
- README sections on browser support and secure-context requirements, the
  button layout and coordinate system, how to choose between the three builds,
  and migrating from `launchpad-mini`.
- A *Known limitations* section documenting twelve confirmed defects, with
  workarounds where they exist.

### Changed

- The README no longer defers to the `launchpad-mini` documentation. The
  library is now documented on its own terms.
- Upgraded Rollup from 4.35.0 to 4.63.4. Bundle output is byte-identical.

### Security

- The Rollup upgrade resolves a high-severity advisory affecting
  `rollup >= 4.0.0, < 4.59.0`. Rollup is a dev dependency, so the published
  package was never affected, but anyone building from source was.

### Notes

No library code changed in this release, so the published behaviour of 1.2.0 is
unaffected.

## [1.2.0] – 2025-03-13

### Changed

- Declared the package as an ES module with `"type": "module"`.
- Upgraded Rollup from 2.45.2 to 4.35.0, and regenerated the bundles.

## [1.1.0] – 2021-04-20

### Added

- A `build` script, and Rollup as a declared dev dependency rather than an
  assumed global.

## [1.0.0] – 2018-02-07

### Added

- Initial release: a browser port of
  [launchpad-mini](https://github.com/Granjow/launchpad-mini/), replacing the
  native Node `midi` module with the Web MIDI API and CommonJS with ES modules,
  and reworking the connection flow around `navigator.requestMIDIAccess()`.
- Rollup builds in three formats: ES module, UMD and IIFE.
- Runnable examples for both the ES module and UMD builds.

[Unreleased]: https://github.com/LostInBrittany/launchpad-webmidi/compare/2.0.0...HEAD
[2.0.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/1.3.0...2.0.0
[1.3.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/1.2.1...1.3.0
[1.2.1]: https://github.com/LostInBrittany/launchpad-webmidi/compare/190b917...1.2.1
[1.2.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/8118867...190b917
[1.1.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/1.0.0...8118867
[1.0.0]: https://github.com/LostInBrittany/launchpad-webmidi/releases/tag/1.0.0
