// rollup.config.js (building more than one bundle)
const input = 'launchpad-webmidi.js';

export default [ {
    // Plain <script> tag: exposes a global named Launchpad.
    input,
    output: {
      file: 'dist/launchpad-webmidi.js',
      format: 'iife',
      name: 'Launchpad'
    }
  }, {
    // ES module: the default for bundlers and <script type="module">.
    input,
    output: {
      file: 'dist/launchpad-webmidi.es.js',
      format: 'es'
    }
  }, {
    // UMD for the browser, kept at its historical path so existing
    // <script src> and CDN links keep working.
    input,
    output: {
      file: 'dist/launchpad-webmidi.umd.js',
      format: 'umd',
      name: 'Launchpad'
    }
  }, {
    // The same UMD bundle with a .cjs extension, so Node parses it as
    // CommonJS despite the package being "type": "module". This is what
    // require('launchpad-webmidi') resolves to.
    input,
    output: {
      file: 'dist/launchpad-webmidi.umd.cjs',
      format: 'umd',
      name: 'Launchpad'
    }
  }
];
