;
(function () {

    "use strict";

    //lazy environment checks
    var isCommonJs = !!(typeof module !== 'undefined' && module.exports),
        isBrowser = typeof window !== 'undefined',
        _io;

    //try and load io-client if in commonJs
    if (isCommonJs) {
        try {
            _io = require('socket.io-client');
        } catch (e) {

        }
    }

    /**
     * Listeners are given a random ID so they can be identified later.
     *
     * @returns {string}
     */
    function makeId() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    /**
     * Simple event wrapper.
     *
     * @param name
     * @param data
     * @constructor
     */
    var Event = function (name, data) {
        this.name = name;
        this.data = data;
        this.get = function (name, defaultValue) {
            return this.data[name] || defaultValue;
        };
    };

    var Adapter = function (options) {

        var _options = options || {};

        this._url           = _options.url;
        this._connection    = null;
        this._listeners     = {};
        this._io            = _options.io || _io || io;
        this.Event          = _options.Event || Event;
    };

    //connect to socket using adapter
    Adapter.prototype.connect = function (options) {

        var _options = options || {
            url: this._url
        }, url = _options.url || this._url;

        if (!url) {
            throw new Error('You must have a url to connect to.');
        }

        delete _options.url;

        //create new client
        this._connection = this._io.connect(url, _options);

        //attach all listeners that may have been set before connect was called
        this.attachListeners();
        this.on('dispatch-server-event', this.onServerEvent.bind(this));

        return this;
    };

    Adapter.prototype.send = function (message) {
        this._connection.emit('message', message);
        return this;
    };

    Adapter.prototype.emit = function (name, data, callback) {

        //it's an altair event
        if (name.search(/:/) > -1) {
            data.__event = name;
            name = 'client-event';
        }

        if (callback) {
            this._connection.emit(name, data, callback);
        } else {
            this._connection.emit(name, data)
        }

        return this;
    };

    Adapter.prototype.disconnect = function (callback) {

        var interval;

        if (this._connection && this._connection.connected) {
            this._connection.disconnect();

            interval = setInterval(function () {

                if (!this._connection.connected) {
                    callback(this);
                    clearInterval(interval);
                }

            }.bind(this), 100);

        } else {
            callback(this);
        }
    };

    /**
     * Remove any listener
     *
     * @param event
     * @param cb
     * @returns {Adapter}
     */
    Adapter.prototype.removeListener = function (event, cb) {

        if (this._connection) {
            this._connection.removeListener(event, cb);
        }

        var cleaned = {},
            i = 0,
            events = Object.keys(this._listeners),
            listener;

        for (i; i < events.length; i++) {

            listener = this._listeners[events[i]];
            if (listener.event === event && listener.callback === cb) {
                //remove the listener
            } else {
                cleaned[events[i]] = listener;
            }
        }

        this._listeners = cleaned;

        return this;

    };

    /**
     * (re)Attaches all listeners to the server. This is called whenever a new connection is
     * made in case the connection had dropped
     */
    Adapter.prototype.attachListeners = function () {

        var events = Object.keys(this._listeners),
            i,
            listener;

        for (i = 0; i < events.length; i++) {

            listener = this._listeners[events[i]];
            this.on(listener.event, listener.query, listener.callback, listener.id);

        }

    };

    /**
     * Turn socket.io events into something more formal
     */
    Adapter.prototype.coerceEvent = function (event, data) {

        var _data = data || {};


        if(data instanceof Error) {
            _data = {
                error: data
            }
        }
        _data.client = this;

        return new this.Event(event, _data);

    },

    /**
     * Add an event listener on the servers side if it has a ":" in it. Otherwise keep the listener local
     *
     * @param event
     * @param query
     * @param callback
     */
    Adapter.prototype.on = function (event, query, callback, _id) {

        //query
        if (!callback) {
            callback = query;
            query = undefined;
        }

        var listener = {
            event:    event,
            id:       _id || makeId(),
            callback: callback,
            query:    query
        };

        this._listeners[listener.id] = listener;

        if (this._connection) {

            if (event.search(/:/) === -1) {
                return this._connection.on(event, function (data) {
                    callback(this.coerceEvent(event, data));
                }.bind(this));
            }

            this._connection.emit('register-listener', {
                event: listener.event,
                query: listener.query,
                id:    listener.id
            }, function (pass) {

                if (!pass) {
                    throw new Error('Could not listen into event ' + listener.event + '. Make sure the proper events are configured for sockets.');
                }

            });

        }

    };


    /**
     * When an event is dispatched on the server and we have a listener for it
     *
     * @param data
     */
    Adapter.prototype.onServerEvent = function (data) {

        var listener = this._listeners[data.__id];

        if (listener) {
            listener.callback(this.coerceEvent(data.__event, data));
        }

    };

    //help me to parse settings
    function decodeQueryString(string) {

        if (!string) {
            return {};
        }

        var query = string,
            vars = query.split('&'),
            results = {};

        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            results[pair[0]] = pair[1];
        }

        return results;
    }


    //if we are in the browser
    if (typeof document !== 'undefined') {

        var scripts = document.getElementsByTagName('script'),
            index = scripts.length - 1,
            script = scripts[index],
            options = decodeQueryString(script.src.split('?')[1]);

        if (options && Object.keys(options).length > 0) {

            //create adapter and pass it to sockets.
            altair.sockets.setAdapter(new Adapter(options));

            //connect to the server
            altair.sockets.connect();


        }

        if (!window.altair) {
            window.altair = {};
        }

        if (!window.altair.socketAdapters) {
            window.altair.socketAdapters = {};
        }

        window.altair.socketAdapters = {'socketio': Adapter};
    }

    //we are in commonjs
    if (typeof module != 'undefined' && module.exports) {
        module.exports = Adapter;
    }


})();