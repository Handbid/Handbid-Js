(function () {

    //gives us a Class.extend
    var init = function () {
        var initializing = false, fnTest = /xyz/.test(function () {
            //xyz;
        }) ? /\b_super\b/ : /.*/;

        // The base Class implementation (does nothing)
        Class = function () {

        };

        // Create a new Class that inherits from this class
        Class.extend = function (prop) {
            var _super = this.prototype;

            // Instantiate a base class (but only create the instance,
            // don't run the init constructor)
            initializing = true;
            var prototype = new this();
            initializing = false;


            // Copy the properties over onto the new prototype
            for (var name in prop) {
                // Check if we're overwriting an existing function
                prototype[name] = typeof prop[name] == "function" &&
                    typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                    (function (name, fn) {
                        return function () {
                            var tmp = this._super;

                            // Add a new ._super() method that is the same method
                            // but on the super-class
                            this.inherited = _super[name];

                            // The method only need to be bound temporarily, so we
                            // remove it when we're done executing
                            var ret = fn.apply(this, arguments);
                            this.inherited = tmp;

                            return ret;
                        };
                    })(name, prop[name]) :
                    prop[name];
            }

            if (!prototype['inherited']) {
                prototype['inherited'] = function () {
                };
            }

            // The dummy class constructor
            function Class() {
                // All construction is actually done in the init method
                if (!initializing && this.construct)
                    this.construct.apply(this, arguments);
            }

            // Populate our constructed prototype object
            Class.prototype = prototype;

            // Enforce the constructor to be what we expect
            Class.prototype.constructor = Class;

            // And make this class extendable
            Class.extend = arguments['callee'];

            return Class;
        };
    };


    "use strict";

    function merge(obj1,obj2){
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
        return obj3;
    }

    //lazy environment checks
    var isCommonJs = !!(typeof module !== 'undefined' && module.exports),
        isBrowser = typeof window !== 'undefined',
        addScript = null,
        Class,
        host = '//handbid-js.local',
        firebird = '//firebird.handbid.com:6789',
        cachebuster = 123456789, //for cdn and caching
        defaultOptions = { //default options the Handbid client will receive on instantiation
            dependencies: isBrowser ? ['//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min.js', host + '/lib/items.js?cachebuster=' + cachebuster, host + '/lib/Socket.io.js?cachebuster=' + cachebuster] : [],
            url:          firebird //where we connect by default
        };

    //have we already been included?
    if (isBrowser && window.handbid) {
        console.error(new Error('Handbid has been double included.'));
        return;
    }

    //setup for environments
    if (isBrowser) {

        addScript = function (src) {
            var s = document.createElement('script');
            s.setAttribute('src', src);
            document.body.appendChild(s);
        };

    }

    //our on load, empty if not in browser
    var addLoadEvent = !isBrowser ? null : function (func) {
        var oldonload = window.onload;
        if (typeof window.onload != 'function') {
            window.onload = func;
        } else {
            window.onload = function () {
                if (oldonload) {
                    oldonload();
                }
                func();
            }
        }
    };

    init();

    //Very Simple EventEmitter
    var EventEmitter = Class.extend({
        Event:      null,
        _listeners: null,

        /**
         * Add a listener for any event by name
         *
         * @param event
         * @param callback
         */
        on: function (event, callback) {

            if(!this._listeners) {
                this._listeners = {};
            }

            if (!this._listeners[event]) {
                this._listeners[event] = [];
            }

            this._listeners[event].push(callback);

        },

        /**
         * Emit an event by name, pass as many arguments as you would like.
         *
         * @param event
         * @param more
         * @returns {EventEmitter}
         */
        emit: function (event, more) {

            if(!this._listeners) {
                this._listeners = {};
            }

            var listeners = this._listeners[event] || [],
                i = 0,
                cb,
                e,
                args = Array.prototype.slice.call(arguments);

            args.shift();

            for (i; i < listeners.length; i++) {

                cb = listeners[i];

                if (this.Event) {

                    e = new this.Event(event, more);
                    cb.call(this, e);

                } else {

                    cb.apply(this, args);

                }

            }

            return this;

        }
    });

    /**
     * Handbid main interface
     */
    var Handbid = EventEmitter.extend({

        options:        null,
        _auctionOnLoad: null,
        _dependencies:  null,
        _io:            null,
        _Adapter:       null,
        auctions:       [],
        authenticated:  false,
        construct:      function (options) {

            var _options        = merge(defaultOptions, options || {});

            //dependency injection
            this._dependencies  = _options.dependencies; //if we want to change dependencies
            this._socket        = _options.socket; //if we want to pass an already instantiated socket adapter
            this._io            = _options.io; //if we want to pass an instance of socket.io (the adapter has not loaded it)

            //save our options for later
            this.options        = _options;

            //default values
            this.auctions = [];

            this.inherited();


        },

        /**
         * Only called from the browser
         *
         * @param cb
         */
        startup: function () {

            //drop in js scripts
            this.injectDependencies();

            //will call itself every n milliseconds until io is loaded (my last dependency)
            var boot = function () {

                if (typeof window.altair === 'undefined' || typeof io === 'undefined') {

                    setTimeout(boot, 250);

                } else {

                    this.connect();

                }

            }.bind(this);

            boot();
        },

        /**
         * Connect to the server
         *
         * @param options
         * @returns {Function|*}
         */
        connect: function (options) {

            var _options = merge(this.options, options || {}),
                Adapter,
                _io      = this._io;

            this.options = _options;

            if (!this._socket) {

                if (isCommonJs) {
                    Adapter = require('./lib/Socket.io.js');
                    _io = _io || require('socket.io-client');
                } else if (window && window.altair && window.altair.socketAdapters) {
                    Adapter = window.altair.socketAdapters.socketio;
                    _io = _io || io; //assume socket.io-client has been included by injectDependencies()
                }

                //make sure we always have a working copy of the io library and the adapter
                this._io        = _io;
                this._Adapter   = Adapter;

                //create a new adapter if we found a class
                if (Adapter) {

                    this._socket = new Adapter({ io: _io});
                    this.Event = this._socket.Event;

                } else {
                    throw new Error('Unable to load socket adapters.');
                }

                //server socket listeners
                this._socket.on('connect', this.onDidConnect.bind(this));
                this._socket.on('error', this.onError.bind(this));

            }

            if (!this._socket) {
                throw new Error('You must first include a socket.io library before you can connect');
            }

            //connect
            this._socket.connect(_options);

            return this._socket;

        },

        /**
         * Disconnect from both main server and auction server
         *
         * @param cb
         */
        disconnect: function (cb) {

            var t = 0,
                count = 0,
                done = function () {
                    t--;
                    if (t === 0) {
                        if (cb) cb();
                    }
                };

            if (this._socket) {
                t++;
            }

            //we have to close down all auctions
            t = t + this.auctions.length;

            if (t === 0) {
                if (cb) cb();
            } else {

                if (this._socket) {
                    this._socket.disconnect(done);
                }

                for (count = 0; count < this.auctions.length; count ++) {
                    this.auctions[count].disconnect(done);
                }

            }

        },

        /**
         * An error occurred on the socket.
         *
         * @param err
         */
        onError: function (err) {

            if(typeof err === 'string') {
                err = new Error(err);
            } else if(err.data && typeof err.data === 'string') {
                err = new Error(err.data);
            }

            this.emit('error', { error: err });
            this.error('server error', arguments);
        },

        /**
         * Alias for console.log so we control logging better
         *
         * @returns {*}
         */
        log: function () {
            return console.log.apply(console, arguments);
        },

        /**
         * Report errors
         *
         * @returns {*}
         */
        error: function () {
            return console.log.apply(console, arguments);
        },

        /**
         * We just connected to the server
         */
        onDidConnect: function () {

            this.connected = true;

            this.emit('did-connect-to-server', {
                handbid: this,
                options: this.options,
                url:     this.options.url
            });

            if (this._auctionOnLoad) {
                this.connectToAuction(this._auctionOnLoad.key, this._auctionOnLoad.options);
            }


        },

        /**
         * Access our server socket
         *
         * @returns {socket|*}
         */
        socket: function () {
            return this._socket;
        },

        /**
         * Auction socket
         *
         * @returns {auctionSocket|*}
         */
        auctionSocket: function () {
            return this._auctionSocket;
        },

        /**
         * Connect to any auction by key (will set the auction key)
         *
         * @param auctionKey
         * @param options
         */
        connectToAuction: function (auctionKey, options) {

            var _options = merge(this.options, options || {});

            if (!this._socket.isConnected()) {

                this._auctionOnLoad = { key: auctionKey, options: _options };

            } else {

                this._socket.emit('connect-to-auction', {
                    auctionKey: auctionKey
                }, function (response) {

                    var __options = merge({
                        io: this._io,
                        Adapter: this._Adapter,
                        Event: this.Event
                    } ,merge(_options, response)),
                        auction = new Auction(__options);

                    auction.connect();
                    auction.on('did-connect', this.onDidConnectToAuction.bind(this));
                    this.auctions.push(auction);


                }.bind(this));
            }

        },


        /**
         *
         * Drops in all the js scripts we've listed as dependencies above.
         */
        injectDependencies: function () {

            this._dependencies.forEach(function (dep) {
                addScript(dep);
            }, this);

        },

        /**
         * Set an auth string to see if the user is valid
         *
         * @param authString
         * @param cb
         */
        setAuth: function (authString, cb) {

            this._socket.emit('authentication', authString, function (err, user) {

                if (err) {

                    err = new Error(err);
                    cb(err);

                } else {

                    this.authenticated = true;

                    //set auth on every auction
                    var i = 0,
                        remaining = this.auctions.length,
                        done = function () {

                            remaining--;
                            if(remaining <= 0) {
                                cb(err, user);
                            }

                        };

                    for (i; i < this.auctions.length; i++) {
                        this.auctions[i].setAuth(authString, done);
                    }

                    if(remaining === 0) {
                        done();
                    }

                }



            }.bind(this));

        },

        /**
         * Update a bidder with new data (actually only works for the logged in bidder currently)
         *
         * @param user
         * @param data
         * @param cb
         */
        updateBidder: function (user, data, cb) {

            this._socket.emit('update-bidder', data, function (err, user) {

                if (err) {
                    err = new Error(err);
                }

                cb(err, user);

            });

        },

        /**
         * Sign up a user.
         *
         * @param values { firstName: 'Tay', lastName: 'Ro', etc...}
         * @param cb should accept 2 params, error, user
         */
        signup: function (values, cb) {

            this._socket.emit('signup-bidder', values, function (err, user) {
                if (err) {
                    err = new Error(err);
                }

                cb(err, user);

            });
        },

        /**
         * Login already
         *
         * @param email
         * @param password
         * @param cb
         */
        login: function (email, password, cb) {

            this._socket.emit('login', {
                email:    email,
                password: password
            }, function (err, user) {

                if (err) {
                    err = new Error(err);
                }

                cb(err, user);

            });

        },

        /**
         * Make it easier to listen in to any connect-to-auction event
         * @param e
         */
        onDidConnectToAuction: function (e) {
            this.emit('did-connect-to-auction', e.data);
        }

    });

    /**
     * Auction interface
     */
    var Auction = EventEmitter.extend({

        options:        null,
        _socket:        null,
        values:         null,
        authenticated:  false,
        construct: function (options) {

            this.options    = options;
            this.Event      = options.Event;

            if(!this.options.io || !this.options.Adapter || !this.options.Event || !this.options.url) {
                throw new Error('You should probably not construct a new Auction manually.');
            }

            this.inherited();

        },

        connect: function (options) {

            var _options = merge(this.options, options || {});

            if(!this._socket) {

                this._socket = new _options.Adapter({ io: _options.io });

                //auction socket listeners
                this._socket.on('connect', this.onDidConnect.bind(this));
                this._socket.on('error', this.onError.bind(this));
                this._socket.on('did-update-auction', this.onDidUpdate.bind(this));
                this._socket.on('did-update-item', this._eventPassthrough.bind(this));

            }

            this._socket.connect(_options);

            return this._socket;

        },

        /**
         * Pass an event from our socket through to anyone listening
         * @param e
         * @private
         */
        _eventPassthrough: function (e) {
            this.emit(e.name, e.data);
        },


        bid: function (itemKey, amount, isProxy, callback) {

            this._socket.emit('bid', {

            }, function (err, results) {

            });

        },

        onDidUpdate: function (e) {

            var updates = e.get('auction');

            this.log('auction update', updates);

        },

        onError: function (err) {
            this.emit('error', err);
            this.error('server error', arguments);
        },

        get: function (name, defaultValue) {
            return this.values[name] || defaultValue;
        },

        /**
         * Refresh the current auction.
         *
         * @param cb callback to be invoked after the refresh is done.
         */
        refresh: function (cb) {

            this._socket.emit('auction', null, function (values) {

                this.values = values;

                if (cb) {
                    cb(this);
                }

            }.bind(this));
        },

        /**
         * We have connected to an auction, lets get the latest details
         */
        onDidConnect: function () {

            this.refresh(function (auction) {

                this.emit('did-connect', {
                    auction: this,
                    handbid: this
                })

            }.bind(this));

        },


        /**
         * Refresh all item prices by keys (or * for all keys)
         *
         * @param itemKeys array of item keys OR a '*' for everything
         * @param cb
         */
        refreshItemPrices: function (itemKeys, cb) {

            if (!this._socket.isConnected()) {
                throw new Error('You must be connected to an auction to refresh item prices.');
            }

            this._socket.emit('item-prices', {
                keys: itemKeys
            }, cb);

        },

        disconnect: function (cb) {

            if (this._socket) {
                this._socket.disconnect(cb);
            } else {
                cb();
            }
        },

        setAuth: function (authString, cb) {

            this._socket.emit('authenticate', authString, function (err, user) {
                if(err) {
                    err = new Error(err);
                }

                this.authenticated = true;
                cb(err, user);

            }.bind(this));

        }

    });


    //if we are in the browser, lets startup the sdk
    if (isBrowser) {
        window.handbid = new Handbid();
        addLoadEvent(window.handbid.startup.bind(window.handbid));
    }
    //for common js
    else if (isCommonJs) {
        module.exports = Handbid;
    }

}());