# Launchpad WebMIDI

Interacting with a Novation Launchpad from your browser with the [web MIDI API](https://webaudio.github.io/web-midi-api/).

This library is based on [launchpad-mini](https://github.com/Granjow/launchpad-mini/) library for Node.
Node modules have been replaced with ES modules, Node midi replaced with Web MIDI API, and the connection workflow has been adapted, but most of the original library API works as usual.


## Installation

- Install via [`bower`](https://bower.io/):

  ```bash
  bower install --save LostInBrittany/launchpad-webmidi
  ```

- Install via [`yarn`](https://yarnpkg.com/):

  ```bash
  yarn add https://github.com/LostInBrittany/launchpad-webmidi.git
  ```

- Install via [`npm`](https://www.npmjs.com/):

  ```bash
  npm install --save git+https://git@github.com/LostInBrittany/launchpad-webmidi.git
  ```

## Usage


### Example using ES Modules

```html
<html>
    <head>
        <title>Launchpad WebMIDI test</title>
    </head>
    <body>
        <script type="module">
            import {Launchpad} from './launchpad-webmidi.js';

            let pad = new Launchpad();
            pad.connect().then( () => {     // Auto-detect Launchpad
                console.log('YEAH')
                pad.reset( 2 );             // Make Launchpad glow yellow
                pad.on( 'key', k => {
                    console.log( `Key ${k.x},${k.y} down: ${k.pressed}`, k);
                    // Make button red while pressed, green after pressing
                    pad.col( k.pressed ? pad.red : pad.green, k );
                } );
            });
        </script>
    </body>
</html>
```