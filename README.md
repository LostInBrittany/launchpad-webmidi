# Launchpad WebMIDI

Interacting with a Novation Launchpad from your browser with the [web MIDI API](https://webaudio.github.io/web-midi-api/).

This library is based on [launchpad-mini](https://github.com/Granjow/launchpad-mini/) library for Node.
Node modules have been replaced with ES modules, Node midi replaced with Web MIDI API, and the connection workflow has been adapted, but most of the original library API works as usual. You can use [launchpad-mini](https://github.com/Granjow/launchpad-mini/) doc as a guide until the doc here will be completed.


## Installation


- Install via [`yarn`](https://yarnpkg.com/):

  ```bash
  yarn add launchpad-webmidi
  ```

- Install via [`npm`](https://www.npmjs.com/):

  ```bash
  npm install launchpad-webmidi
  ```

## Usage

Currenly we use [rollup](https://rollupjs.org/) to generate several versions of *launchpad-webmidi*:

- A self-executing function, suitable for inclusion as a `<script>` tag
- An ES module file
- An UMD file

You can use the version you prefer in your app, we suggest using the ES module if your build tool understand it.


### Example using ES Modules

```html
<script type="module">
    import Launchpad from '../dist/launchpad-webmidi.es.js';

    let pad = new Launchpad();
    pad.connect().then(() => {     // Auto-detect Launchpad
        console.log('Launchpad connected')
        pad.reset(2);             // Make Launchpad glow yellow
        pad.on('key', k => {
            console.log(`Key ${k.x},${k.y} down: ${k.pressed}`, k);
            // Make button red while pressed, green after pressing
            pad.col(k.pressed ? pad.red : pad.green, k);
        });
    });
</script>
```

You can see the full example in [examples/basic-with-esm.html](examples/basic-with-esm.html) and a slightly more complex one on [examples/switch-color-with-esm.html](examples/switch-color-with-esm.html).

### Example using UMD

```html
<script src='../dist/launchpad-webmidi.umd.js'></script>
<script>
    let pad = new Launchpad();
    pad.connect().then(() => {     // Auto-detect Launchpad
        console.log('Launchpad connected')
        pad.reset(2);             // Make Launchpad glow yellow
        pad.on('key', k => {
            console.log(`Key ${k.x},${k.y} down: ${k.pressed}`, k);
            // Make button red while pressed, green after pressing
            pad.col(k.pressed ? pad.red : pad.green, k);
        });
    });
</script>
```

You can see the full example in [examples/basic-with-umd.html](examples/basic-with-umd.html) and a slightly more complex one on [examples/switch-color-with-umd.html](examples/switch-color-with-umd.html).


## License

[MIT License](http://opensource.org/licenses/MIT)
