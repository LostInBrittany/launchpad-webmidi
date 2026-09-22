# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Notes

No library code changed in this release, so the published behaviour of 1.2.0 is
unaffected. Fixes for the documented defects are planned for a later release;
the `fromPattern()` fix changes public behaviour and will require a major
version.

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

[Unreleased]: https://github.com/LostInBrittany/launchpad-webmidi/compare/190b917...HEAD
[1.2.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/8118867...190b917
[1.1.0]: https://github.com/LostInBrittany/launchpad-webmidi/compare/1.0.0...8118867
[1.0.0]: https://github.com/LostInBrittany/launchpad-webmidi/releases/tag/1.0.0
