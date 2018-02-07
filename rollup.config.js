// rollup.config.js (building more than one bundle)
export default [{
    input: 'launchpad-webmidi.js',
    output: {
      file: 'dist/launchpad-webmidi.js',
      format: 'iife',
      name: 'Launchpad'
    }
  },{
    input: 'launchpad-webmidi.js',
    output: {
      file: 'dist/launchpad-webmidi.es.js',
      format: 'es'
    }
  },{
    input: 'launchpad-webmidi.js',
    output: {
      file: 'dist/launchpad-webmidi.umd.js',
      format: 'umd',
      name: 'Launchpad'
    }
  }
];