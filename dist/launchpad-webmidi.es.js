/*
 Launchpad describes brightness levels as a “duty cycle” fraction described by
 f = num/den. num is a number between 1 and 16, den is a number between 3 and 18.
 */

const num = (new Array( 16 )).fill( 0 ).map( ( el, ix ) => ix + 1 );
const den = (new Array( 16 )).fill( 0 ).map( ( el, ix ) => ix + 3 );

let arr = num.map( nu => den.map( de => [ nu, de ] ) )
    .reduce( ( acc, cur ) => acc.concat( cur ), [] )
    .filter( pair => pair[ 0 ] <= pair[ 1 ] ) // Remove all numbers where the fraction is > 1
    .map( pair => [ pair[ 0 ], pair[ 1 ], pair[ 0 ] / pair[ 1 ] ] ) // now contains all [ num, den, f ] pairs
    .sort( ( a, b ) => a[ 2 ] - b[ 2 ] ) // Sort by size
    .filter( ( el, ix, arr ) => !(ix > 0 && arr[ ix - 1 ][ 2 ] === el[ 2 ]) ); // Remove all duplicates

/**
 * This method finds the best duty cycle match for the given brightness.
 * @param {Number} t Brightness level between 0 and 1
 * @returns {Array.<Number>} Array [ numerator, denominator, fraction ]
 */
const getNumDen = function ( t ) {
    return arr[ Math.min( arr.length - 1, Math.max( 0, Math.round( t * arr.length ) ) ) ];
};

/**
 * All Launchpad buttons
 * @type {Array.<Number>}
 */
const All = (new Array( 80 )).fill( 0 )
    .map( ( empty, ix ) => [ ix % 9, (ix - ix % 9) / 9 ] )
    .map( ( xy ) => {
        xy.id = Symbol();
        return xy;
    } );
/**
 * Grid buttons (8×8 square buttons)
 * @type {Array.<Number>}
 */
const Grid = All.filter( ( xy ) => xy[ 0 ] < 8 && xy[ 1 ] < 8 );
/**
 * Automap buttons (top row of round buttons)
 * @type {Array.<Number>}
 */
const Automap = All.filter( ( xy ) => xy[ 1 ] === 8 );
/**
 * Scene buttons (right row of round buttons)
 * @type {Array.<Number>}
 */
const Scene = All.filter( ( xy ) => xy[ 0 ] === 8 );

const mapById = new Map();
All.forEach( b => mapById.set( b.id, b ) );

const byId = ( id ) => {
    return mapById.get( id );
};

const byXy = ( x, y ) => {
    return All[ 9 * y + x ];
};

const Buttons = {
    All,
    Grid,
    Automap,
    Scene,
    byId,
    byXy
};

const numbersFromCoords = function ( buttons ) {
    return Array.prototype.map.call( buttons || [], ( b, ix ) => ({
        select: b === 'x' || b === 'X',
        ix: ix === 0 ? 8 : ix - 1
    }) )
        .filter( b => b.select )
        .map( b => b.ix );
};

const asRow = function ( row, cols ) {
    return cols.map( col => [ row, col ] );
};
const asCol = function ( col, rows ) {
    return rows.map( row => [ row, col ] );
};

/**
 * Convert a modifier to data. A modifier is a human-readable string describing a button row or column
 * on the launchpad; see the description of the modifier parameter below.
 * @param {String} modifier Can be 'sc' for Scene buttons, 'am' for Automap buttons, 'rX' for row number X,
 * or 'cX' for column number X
 * @returns {{row:Boolean, nr:Number}|{error:Boolean}}
 */
const decodeModifier = function ( modifier ) {
    let mod = (modifier || '').toLowerCase(),
        nr = Number( mod[ 1 ] );
    if ( mod === 'sc' ) {
        return { row: true, nr: 8 };
    } else if ( mod === 'am' ) {
        return { row: false, nr: 8 };
    }
    if ( !isNaN( nr ) ) {
        if ( mod[ 0 ] === 'r' ) {
            return { row: true, nr: Number( mod[ 1 ] ) };
        } else if ( mod[ 0 ] === 'c' ) {
            return { row: false, nr: Number( mod[ 1 ] ) };
        }
    }
    return { error: true };
};

/**
 * Higher-order function which returns a function for the given modifier. The returned function takes a button number
 * and returns the button coordinates; the first part of the coordinate is given by the modifier, the second one
 * by the number(s) following it. For example, 'r4 1 2' describes buttons 1 and 2 on row 4; the function returns
 * those coordinates.
 * @param {String} modifier See #decodeModifier
 * @returns {function(Array.<Number>):Array.<Number>} This function takes a number and returns a button.
 */
const getDecoder = function ( modifier ) {
    let mod = decodeModifier( modifier );
    return mod.err ? () => [] : mod.row ? asRow.bind( null, mod.nr ) : asCol.bind( null, mod.nr )
};

/**
 * Returns a copy of the input array which is sorted and without duplicates.
 * @param {Array.<Number>} coords
 * @returns {Array.<Number>}
 */
const uniqueCoords = function ( coords ) {
    return coords.sort( ( a, b ) => {
        if ( a[ 0 ] !== b[ 0 ] ) {
            return a[ 0 ] - b[ 0 ];
        }
        return a[ 1 ] - b[ 1 ];
    } ).filter( ( el, ix, arr ) => {
        return ix === 0 || !(
            el[ 0 ] === arr[ ix - 1 ][ 0 ] &&
            el[ 1 ] === arr[ ix - 1 ][ 1 ]
        );
    } );
};

/**
 * Converts a string describing a row or column to button coordinates.
 * @param {String} pattern String format is 'mod:pattern', with *mod* being
 * one of rN (row N, e.g. r4), cN (column N), am (automap), sc (scene). *pattern* are buttons from 0 to 8, where an 'x' or 'X'
 * marks the button as selected, and any other character is ignored; for example: 'x..xx' or 'X  XX'.
 */
const decodeString = function ( pattern ) {
    pattern = pattern || '';
    return getDecoder( pattern.substring( 0, 2 ) )( numbersFromCoords( pattern.substring( 2 ) ) );
};

/**
 * @param {Array.<Array.<Number>>} arrays
 * @returns {Array.<Number>}
 */
const mergeArray = function ( arrays ) {
    return arrays.reduce( ( acc, cur ) => acc.concat( cur ), [] );
};

/**
 * Like decodeString(), but for an array of patterns.
 * @param {Array.<String>} patterns
 * @returns {Array.<Number>}
 */
const decodeStrings = function ( patterns ) {
    return uniqueCoords( mergeArray( patterns.map( decodeString ) ) );
};

class Color {

    constructor( level, clear, copy, name ) {
        this._level = level;
        this._clear = clear;
        this._copy = copy;
        this._name = name;
        return this;
    }

    /**
     * Turn off LEDs.
     * @return {Color}
     */
    get off() {
        return this.level( 0 );
    }

    /**
     * Low brightness
     * @return {Color}
     */
    get low() {
        return this.level( 1 );
    }

    /**
     * Medium brightness
     * @return {Color}
     */
    get medium() {
        return this.level( 2 );
    }

    /**
     * Full brightness
     * @return {Color}
     */
    get full() {
        return this.level( 3 );
    }

    /**
     * Set a numeric brightness level for this color.
     * @param {Number} n Level between 0 and 3
     * @return {Color}
     */
    level( n ) {
        return new Color( Math.min( 3, Math.max( 0, Math.round( n ) ) ), this._clear, this._copy, this._name );
    }

    /**
     * For the other buffer, turn the LED off.
     *
     * If neither clear nor copy are set, the other buffer will not be modified.
     * @return {Color}
     */
    get clear() {
        return new Color( this._level, true, this._copy, this._name );
    }

    /**
     * For the other buffer, use the same color.
     * This overrides the `clear` bit.
     *
     * If neither clear nor copy are set, the other buffer will not be modified.
     * @return {Color}
     */
    get copy() {
        return new Color( this._level, this._clear, true, this._name );
    }

    /**
     * @return {Number} MIDI code of this color
     */
    get code() {
        let r = this._level * (this._name === 'red' || this._name === 'amber'),
            g = this._level * (this._name === 'green' || this._name === 'amber');
        if ( this._name === 'yellow' && this._level > 0 ) {
            r = 2;
            g = 3;
        }
        return (
            0b10000 * g +
            0b01000 * this._clear +
            0b00100 * this._copy +
            0b00001 * r
        );
    }
}

/** @type {Color} */
const red = new Color( 3, false, false, 'red' );
/** @type {Color} */
const green = new Color( 3, false, false, 'green' );
/** @type {Color} */
const amber = new Color( 3, false, false, 'amber' );
/** @type {Color} */
const yellow = new Color( 3, false, false, 'yellow' );
/** @type {Color} */
const off = new Color( 3, false, false, 'off' );

class Observable {
    constructor() {
        this.observers = {};
    }

    on(event, callback){
        if (typeof callback !== 'function') return;
        (this.observers[event] = this.observers[event] || []).push(callback);
    }

    emit(event){
        let args = Array.prototype.slice.call(arguments, 1);
        (this.observers[event] || []).forEach(function(callback){
            callback.apply(undefined, args);
        });
    }
}

class Launchpad extends Observable {
    constructor() {
        super();

        this.name = 'Launchpad';
        /**
         * Storage format: [ {x0 y0}, {x1 y0}, ...{x9 y0}, {x0 y1}, {x1 y1}, ... ]
         * @type {Array.<{pressed:Boolean, x:Number, y:Number, cmd:Number, key:Number, id:Symbol}>}
         */
        this._buttons = Buttons.All
            .map( b => ({
                x: b[ 0 ],
                y: b[ 1 ],
                id: b.id
            }) )
            .map( b => {
                b.cmd = b.y >= 8 ? 0xb0 : 0x90;
                b.key = b.y >= 8 ? 0x68 + b.x : 0x10 * b.y + b.x;
                return b;
            } );

        /** @type {Number} */
        this._writeBuffer = 0;

        /** @type {Number} */
        this._displayBuffer = 0;

        /** @type {Boolean} */
        this._flashing = false;

        /** @type {Color} */
        this.red = red;
        /** @type {Color} */
        this.green = green;
        /** @type {Color} */
        this.amber = amber;
        /**
         * Due to limitations in LED levels, only full brightness is available for yellow,
         * the other modifier versions have no effect.
         * @type {Color}
         */
        this.yellow = yellow;
        /** @type {Color} */
        this.off = off;

        return this;    
    }
  


    extractLaunchpadIO(items) {
        var item = items.next();
        while (!item.done) {
            if (item.value.name.indexOf(this.name) >= 0) {
                return item.value;
            }
            item = items.next();
        }
        return undefined;
    }

    connect() {
        return new Promise( ( res, rej ) => {
            if (!navigator.requestMIDIAccess){
                rej(`Browser doesn't seem to support Web MIDI API`);
            } else {
                navigator.requestMIDIAccess()
                    .then((midiAccess) => {
                        return {
                            'input': this.extractLaunchpadIO(midiAccess.inputs.values()),
                            'output': this.extractLaunchpadIO(midiAccess.outputs.values())
                        }
                    })
                    .then((io) => {                        
                        return new MidiAdapter(io.input, io.output);
                    })
                    .then((midiAdapter) => {
                        this.midiIn = midiAdapter.input;
                        this.midiOut = midiAdapter.output;
                        window.dispatchEvent(
                            new CustomEvent('connect', { detail: 'Launchpad connected' }));
                        console.log(`[Launchpad] connect() - Connected`,this.midiIn, this.midiOut);
                        this.midiIn.onmidimessage = (data) => this._processMessage(data);
                        res();
                    })
                    .catch(rej);
            }
        });
    }

    /**
     * Reset mapping mode, buffer settings, and duty cycle. Also turn all LEDs on or off.
     *
     * @param {Number=} brightness If given, all LEDs will be set to the brightness level (1 = low, 3 = high).
     * If undefined (or any other number), all LEDs will be turned off.
     */
    reset( brightness ) {
        brightness = brightness > 0 && brightness <= 3 ? brightness + 0x7c : 0;
        this.sendRaw( [ 0xb0, 0x00, brightness ] );
    }

    sendRaw( data ) {
        this.midiOut.send( data );
    }

    /**
     * Get a list of buttons which are currently pressed.
     * @returns {Array.<Array.<Number>>} Array containing [x,y] pairs of pressed buttons
     */
    get pressedButtons() {
        return this._buttons.filter( b => b.pressed )
            .map( b => Buttons.byXy( b.x, b.y ) );
    }    

    /**
     * Check if a button is pressed.
     * @param {Array.<Number>} button [x,y] coordinates of the button to test
     * @returns {boolean}
     */
    isPressed( button ) {
        return this._buttons.some( b => b.pressed && b.x === button[ 0 ] && b.y === button[ 1 ] );
    }

    /**
     * Set the specified color for the given LED(s).
     * @param {Number|Color} color A color code, or one of the pre-defined colors.
     * @param {Array.<Number>|Array.<Array.<Number>>} buttons [x,y] value pair, or array of pairs
     * @return {Promise} Resolves as soon as the Launchpad has processed all data.
     */
    col( color, buttons ) {
        // Code would look much better with the Rest operator ...

        if ( buttons.length > 0 && buttons[ 0 ] instanceof Array ) {
            buttons.forEach( btn => this.col( color, btn ) );
            return new Promise( ( res, rej ) => setTimeout( res, buttons.length / 20 ) );

        } else {
            let b = this._button( buttons );
            if ( b ) {
                this.sendRaw( [ b.cmd, b.key, color.code || color ] );
            }
            return Promise.resolve( !!b );
        }
    }

    /**
     * Set colors for multiple buttons.
     * @param {Array.<Array.<>>} buttonsWithColor Array containing entries of the form [x,y,color].
     * @returns {Promise}
     */
    setColors( buttonsWithColor ) {
        buttonsWithColor.forEach( btn => this.setSingleButtonColor( btn, btn[ 2 ] ) );
        return new Promise( ( res ) => setTimeout( res, buttonsWithColor.length / 20 ) );
    }

    setSingleButtonColor( xy, color ) {
        let b = this._button( xy );
        if ( b ) {
            this.sendRaw( [ b.cmd, b.key, color.code || color ] );
        }
        return !!b;
    }

    /**
     * @return {Number} Current buffer (0 or 1) that is written to
     */
    get writeBuffer() {
        return this._writeBuffer;
    }

    /**
     * @return {Number} Current buffer (0 or 1) that is displayed
     */
    get displayBuffer() {
        return this._displayBuffer;
    }

    /**
     * Select the buffer to which LED colors are written. Default buffer of an unconfigured Launchpad is 0.
     * @param {Number} bufferNumber
     */
    set writeBuffer( bufferNumber ) {
        this.setBuffers( { write: bufferNumber } );
    }

    /**
     * Select which buffer the Launchpad uses for the LED button colors. Default is 0.
     * Also disables flashing.
     * @param {Number} bufferNumber
     */
    set displayBuffer( bufferNumber ) {
        this.setBuffers( { display: bufferNumber, flash: false } );
    }

    /**
     * Enable flashing. This essentially tells Launchpad to alternate the display buffer
     * at a pre-defined speed.
     * @param {Boolean} flash
     */
    set flash( flash ) {
        this.setBuffers( { flash: flash } );
    }

    /**
     * @param {{write:Number=, display:Number=, copyToDisplay:Boolean=, flash:Boolean=}=} args
     */
    setBuffers( args ) {
        args = args || {};
        this._flashing = or( args.flash, this._flashing );
        this._writeBuffer = 1 * or( args.write, this._writeBuffer );
        this._displayBuffer = 1 * or( args.display, this._displayBuffer );

        let cmd =
            0b100000 +
            0b010000 * or( args.copyToDisplay, 0 ) +
            0b001000 * this._flashing +
            0b000100 * this.writeBuffer +
            0b000001 * this.displayBuffer;

        this.sendRaw( [ 0xb0, 0x00, cmd ] );
    }

    /**
     * Set the low/medium button brightness. Low brightness buttons are about `num/den` times as bright
     * as full brightness buttons. Medium brightness buttons are twice as bright as low brightness.
     * @param {Number=} num Numerator, between 1 and 16, default=1
     * @param {Number=} den Denominator, between 3 and 18, default=5
     */
    multiplexing( num, den ) {
        let data,
            cmd;
        num = Math.max( 1, Math.min( num || 1, 16 ) );
        den = Math.max( 3, Math.min( den || 5, 18 ) );
        if ( num < 9 ) {
            cmd = 0x1e;
            data = 0x10 * (num - 1) + (den - 3);
        } else {
            cmd = 0x1f;
            data = 0x10 * (num - 9) + (den - 3);
        }
        this.sendRaw( [ 0xb0, cmd, data ] );
    }

    /**
     * Set the button brightness for buttons with non-full brightness.
     * Lower brightness increases contrast since the full-brightness buttons will not change.
     *
     * @param {Number} brightness Brightness between 0 (dark) and 1 (bright)
     */
    brightness( brightness ) {
        this.multiplexing.apply( this, getNumDen( brightness ) );
    }

    /**
     * Generate an array of coordinate pairs from a string “painting”. The input string is 9×9 characters big
     * and starts with the first button row (including the scene buttons on the right). The last row is for the
     * Automap buttons which are in reality on top on the Launchpad.
     *
     * Any character which is a lowercase 'x' will be returned in the coordinate array.
     *
     * The generated array can be used for setting button colours, for example.
     *
     * @param {String} map
     * @returns {Array.<Array.<Number>>} Array containing [x,y] coordinate pairs.
     */
    fromMap( map ) {
        return Array.prototype.map.call( map, ( char, ix ) => ({
            x: ix % 9,
            y: (ix - (ix % 9)) / 9,
            c: char
        }) )
            .filter( data => data.c === 'x' )
            .map( data => Buttons.byXy( data.x, data.y ) );
    }

    /**
     * Converts a string describing a row or column to button coordinates.
     * @param {String|Array.<String>} pattern String pattern, or array of string patterns.
     * String format is 'mod:pattern', with *mod* being one of rN (row N, e.g. r4), cN (column N), am (Automap), sc (Scene).
     * *pattern* are buttons from 0 to 8, where an 'x' or 'X' marks the button as selected,
     * and any other character is ignored; for example: 'x..xx' or 'X  XX'.
     */
    fromPattern( pattern ) {
        if ( pattern instanceof Array ) {
            return decodeStrings( pattern );
        }
        return decodeString( pattern )
            .map( xy => Buttons.byXy( xy[ 0 ], xy[ 1 ] ) );
    }

    /**
     * @returns {{pressed: Boolean, x: Number, y: Number, cmd:Number, key:Number, id:Symbol}} Button at given coordinates
     */
    _button( xy ) {
        return this._buttons[ 9 * xy[ 1 ] + xy[ 0 ] ];
    }

    _processMessage( msg ) {

        let message = msg.data;
        let x, y, pressed;
        if ( message[ 0 ] === 0x90 ) {

            // Grid pressed
            x = message[ 1 ] % 0x10;
            y = (message[ 1 ] - x) / 0x10;
            pressed = message[ 2 ] > 0;

        } else if ( message[ 0 ] === 0xb0 ) {

            // Automap/Live button
            x = message[ 1 ] - 0x68;
            y = 8;
            pressed = message[ 2 ] > 0;

        } else {
            console.log( `Unknown message: ${message} ` );
            return;
        }


        let button = this._button( [ x, y ] );
        button.pressed = pressed;
        this.emit( 'key', {
            x: x, y: y, pressed: pressed, id: button.id,
            // Pretend to be an array so the returned object
            // can be fed back to .col()
            0: x, 1: y, length: 2
        } );
    }
}



class MidiAdapter {
    constructor(input, output) {
        this.input = input;
        this.output = output;
    }
}

export default Launchpad;
