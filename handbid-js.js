(function () {


    /* Simple JavaScript Inheritance
     * By John Resig http://ejohn.org/
     * MIT Licensed.
     *
     * Modified by Taylor Romero http://taylorrome.ro to conform more to
     * internal conventions at Handbid http://handbid.com
     */
    //gives us a Class.extend
    var init = function () {
        var initializing = false, fnTest = /xyz/.test(function () {
            xyz;
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

    //lazy environment checks
    var isCommonJs = !!(typeof module !== 'undefined' && module.exports),
        isBrowser = typeof window !== 'undefined',
        addScript = null,
        Class,
        defaultOptions = { //default options the Handbid client will receive on instantiation
            dependencies: isBrowser ? ['//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min.js', '//js.handbid.com/lib/items.js', '//js.handbid.com/lib/Socket.io.js'] : [],
            url:          '//home.handbid.com:6789' //where we connect by default
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
    }

    init();

    //Very Simple EventEmitter
    var EventEmitter = Class.extend({
        Event:      null,
        _listeners: {},

        /**
         * Add a listener for any event by name
         *
         * @param event
         * @param callback
         */
        on: function (event, callback) {

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

            var listeners = this._listeners[event] || [],
                i = 0,
                cb,
                e,
                args = Array.prototype.slice.call(arguments);

            args.shift();

            for (i; i < listeners.length; i++) {

                cb = listeners[i];

                //it was already an event
                if(more instanceof this.Event) {

                    cb.call(this, more);

                } else if (this.Event) {

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
        _auction:       null,
        _auctionOnLoad: null,
        _url:           '',
        _dependencies:  null,
        connected:      false,
        construct:      function (options) {

            var _options = options || {};

            this._dependencies = _options.dependencies || defaultOptions.dependencies;
            this._url = _options.url || defaultOptions.url;
            this._serverSocket = _options.serverSocket;
            this._auctionSocket = _options.auctionSocket;


            this.options = _options;

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

            var _options = options || {
                url: this._url
            }, a, _io;

            //ensure there is a URL in there
            if (!_options.url) {
                _options.url = this._url;
            }

            this.options = _options;
            this._url = this.options.url;

            if (!this._serverSocket) {

                if (isCommonJs) {
                    a = require('./lib/Socket.io.js');
                    _io = require('socket.io-client');
                } else if (window && window.altair && window.altair.socketAdapters) {
                    a = window.altair.socketAdapters.socketio;
                    _io = io; //assume socket.io-client has been included by injectDependencies()
                }

                if (a) {

                    this._serverSocket = new a({ io: _io});
                    this._auctionSocket = new a({ io: _io});

                    this.Event = this._serverSocket.Event;

                } else {
                    throw new Error('Unable to load socket adapters.');
                }

                //server socket listeners
                this._serverSocket.on('connect', this.onDidConnectToServer.bind(this));
                this._serverSocket.on('error', this.onServerError.bind(this));

                //auction socket listeners
                this._auctionSocket.on('connect', this.onDidConnectToAuction.bind(this));
                this._auctionSocket.on('error', this.onAuctionError.bind(this));
                this._auctionSocket.on('did-update-auction', this.onDidUpdateAuction.bind(this));

            }

            if (!this._serverSocket) {
                throw new Error('You must first include a socket.io library before you can connect');
            }

            this._serverSocket.connect(_options);

            return this._serverSocket;

        },

        /**
         * Disconnect from both main server and auction server
         *
         * @param cb
         */
        disconnect: function (cb) {

            var t = 0,
                done = function () {
                    t--;
                    if (t === 0) {
                        if (cb) cb();
                    }
                };
            if (this._serverSocket) {
                t++;
            }

            if (this._auctionSocket) {
                t++;
            }

            if (t === 0) {
                if (cb) cb();
            } else {

                if (this._serverSocket) {
                    this._serverSocket.disconnect(done);
                }

                if (this._auctionSocket) {
                    this._auctionSocket.disconnect(done);
                }
            }

        },

        /**
         * An error occurred on the server socket.
         *
         * @param err
         */
        onServerError: function (err) {
            this.emit('error', err);
            this.error('server error', arguments);
        },

        /**
         * The auction socket had an error
         *
         * @param err
         */
        onAuctionError: function (err) {
            this.emit('error', err);
            this.error('auction error', arguments);
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
            return console.log.error(console, arguments);
        },

        /**
         * We just connected to the server
         */
        onDidConnectToServer: function () {

            this.connected = true;

            if (this._auctionOnLoad) {
                this.connectToAuction(this._auctionOnLoad.key, this._auctionOnLoad.options);
            }

            this.emit('did-connect-to-server', {
                handbid: this,
                url:     this._url
            });

        },

        /**
         * Access our server socket
         *
         * @returns {serverSocket|*}
         */
        serverSocket: function () {
            return this._serverSocket;
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

            var _options = options || this.options;

            if (!this.connected) {

                this._auctionOnLoad = { key: auctionKey, options: _options };

            } else {

                this._serverSocket.emit('connect-to-auction', {
                    auctionKey: auctionKey
                }, function (response) {

                    _options.url = response.url

                    this._auctionSocket.connect(_options);

                }.bind(this));
            }

        },

        /**
         * An auction was updated on the server
         *
         * @param e
         */
        onDidUpdateAuction: function (e) {
            var updates = e.get('auction');
            this.log('auction update', updates);
        },


        /**
         * Gets you the current auction.
         *
         * @returns {{}}
         */
        auction: function () {

            var auction = this._auction || {},
                socket = this.auctionSocket();

            auction.on = socket.on.bind(socket);

            return auction;

        },

        /**
         * Refresh the current auction.
         *
         * @param cb callback to be invoked after the refresh is done.
         */
        refreshAuction: function (cb) {

            this.auctionSocket().emit('auction', null, function (auction) {

                this._auction = auction;

                if (cb) {
                    cb(auction);
                }

            }.bind(this));
        },

        /**
         * Refresh all item prices by keys (or * for all keys)
         *
         * @param itemKeys array of item keys OR a '*' for everything
         * @param cb
         */
        refreshItemPrices: function (itemKeys, cb) {

            this.auctionSocket().emit('item-prices', {
                keys: itemKeys
            }, cb);

        },

        /**
         * We have connected to an auction, lets get the latest details
         */
        onDidConnectToAuction: function () {

            this.refreshAuction(function (auction) {

                this._auction = auction;

                this.emit('did-connect-to-auction', {
                    auction: this.auction(),
                    handbid: this
                })

            }.bind(this));

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

        setAuth: function (authString, cb) {
            this._serverSocket.emit('authentication', authString, function(err, user){
                if(err){
                    err = new Error(err);
                }



                cb( err, user );

            });

        },

        /**
         * Sign up a user.
         *
         * @param values { firstName: 'Tay', lastName: 'Ro', etc...}
         * @param cb should accept 2 params, error, user
         */
        signupBidder: function (values, cb) {

            this._serverSocket.emit('signup-bidder', values, function(err, user){
                if(err) {
                    err = new Error(err);
                }

                cb( err, user );

            });
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