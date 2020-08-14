const { GLib } = imports.gi;

let ink = { Ink: null };
try {
    ink = imports.ink;
} catch(e) {}
const { Ink } = ink;

const DEBUG_ENV = GLib.getenv('DEBUG');

var Debugger = class
{
    constructor(name, opts)
    {
        opts = (opts && typeof opts === 'object')
            ? opts : {};

        this.name = (name && typeof name === 'string')
            ? name : 'GJS';

        this.print_state = (opts.print_state)
            ? true : false;

        this.json_space = (typeof opts.json_space === 'number')
            ? opts.json_space : 2;

        this.name_printer    = opts.name_printer    || this._getInkPrinter(true);
        this.message_printer = opts.message_printer || this._getDefaultPrinter();
        this.time_printer    = opts.time_printer    || this._getInkPrinter();

        this._isEnabled = false;
        this._lastDebug = Date.now();

        this.enabled = (typeof opts.enabled !== 'undefined')
            ? opts.enabled : this._enabledAtStart;
    }

    get enabled()
    {
        return this._isEnabled;
    }

    set enabled(value)
    {
        if(this._isEnabled === value)
            return;

        this._isEnabled = (value) ? true : false;

        if(!this.print_state)
            return;

        let state = (this.enabled) ? 'en' : 'dis';
        this._runDebug(`debug ${state}abled`);
    }

    get debug()
    {
        return message => this._debug(message);
    }

    get _enabledAtStart()
    {
        if(!DEBUG_ENV)
            return false;

        let envArr = DEBUG_ENV.split(',');

        return envArr.some(el => {
            if(el === this.name || el === '*')
                return true;

            let searchType;
            let offset = 0;

            if(el.startsWith('*')) {
                searchType = 'ends';
            } else if(el.endsWith('*')) {
                searchType = 'starts';
                offset = 1;
            }

            if(!searchType)
                return false;

            return this.name[searchType + 'With'](
                el.substring(1 - offset, el.length - offset)
            );
        });
    }

    _getInkPrinter(isBold)
    {
        if(!Ink)
            return this._getDefaultPrinter();

        let printer = new Ink.Printer({
            color: Ink.colorFromText(this.name)
        });

        if(isBold)
            printer.font = Ink.Font.BOLD;

        return printer;
    }

    _getDefaultPrinter()
    {
        return {
            getPainted: function() {
                return Object.values(arguments);
            }
        };
    }

    _debug(message)
    {
        if(!this.enabled)
            return;

        this._runDebug(message);
    }

    _runDebug(message)
    {
        switch(typeof message) {
            case 'string':
                break;
            case 'object':
                if(message !== null && message.constructor !== RegExp) {
                    message = JSON.stringify(message, null, this.json_space);
                    break;
                }
            default:
                message = String(message);
                break;
        }

        let time = Date.now() - this._lastDebug;
        time = (time < 1000)
            ? '+' + time + 'ms'
            : '+' + Math.floor(time / 1000) + 's';

        printerr(
            this.name_printer.getPainted(this.name),
            this.message_printer.getPainted(message),
            this.time_printer.getPainted(time)
        );

        this._lastDebug = Date.now();
    }
}
