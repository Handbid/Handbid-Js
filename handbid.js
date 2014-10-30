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
        host            = 'https://beta-js.hand.bid', //where am i hosted and available to the planet?
        firebird        = 'https://beta-firebird.hand.bid:6789',
        connectEndpoint = 'http://beta-connect.hand.bid:8082',   //connect.handbid.com (where i send people to login/signup)
        cachebuster     = 123456789, //for cdn and caching (randomized by the "cache buster buster buster" on push)
        defaultOptions  = { //default options the Handbid client will receive on instantiation
            connectEndpoint: connectEndpoint, //where we point for connect.handbid
            url:             firebird, //where we connect by default
            'force new connection': true,
            reconnect:       false, //we handle reconnect attempts ourselves
            dependencies: isBrowser ? [
                '//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min.js',
                host + '/lib/browser.js?cachebuster=' + cachebuster,
                host + '/lib/items.js?cachebuster=' + cachebuster,
                host + '/lib/Socket.io.js?cachebuster=' + cachebuster,
                host + '/lib/connect.js?cachebuster=' + cachebuster,
                host + '/lib/profile.js?cachebuster=' + cachebuster,
                host + '/lib/messaging.js?cachebuster=' + cachebuster,
                host + '/lib/bid.js?cachebuster=' + cachebuster,
                host + '/lib/health.js?cachebuster=' + cachebuster,
                host + '/lib/timer.js?cachebuster=' + cachebuster,
                host + '/lib/stats.js?cachebuster=' + cachebuster,
                host + '/lib/tickets.js?cachebuster=' + cachebuster
            ] : []
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
        auctions:       null,
        auctionsByKey:  null,
        authenticated:  false,
        connectEndpoint:null,
        authString:     '',
        _reconnectTimeout: null,

        construct:      function (options) {

            var _options        = merge(defaultOptions, options || {});

            //dependency injection
            this._dependencies      = _options.dependencies; //if we want to change dependencies
            this._socket            = _options.socket; //if we want to pass an already instantiated socket adapter
            this._io                = _options.io; //if we want to pass an instance of socket.io (the adapter has not loaded it)
            this.connectEndpoint    = _options.connectEndpoint;

            //save our options for later
            this.options        = _options;

            //default values
            this.auctions = [];
            this.auctionsByKey = {};

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

            this.options = merge(this.options, options || {});

            var _options = merge(this.options, {}),//make shallow copy because socket.io mutates options
                Adapter,
                _io      = this._io;

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
                this._socket.on('disconnect', this.onDisconnect.bind(this));
                this._socket.on('message', this._eventPassthrough.bind(this));

            }

            if (!this._socket) {
                throw new Error('You must first include a socket.io library before you can connect');
            }

            //connect
            this._socket.connect(_options);

            return this._socket;

        },

        handleReconnect: function () {

            if (this._reconnectTimeout) {
                this._reconnectTimeout = clearTimeout(this._reconnectTimeout);
            }

            if(!this._socket || !this._socket.isConnected()) {
                this._reconnectTimeout = setTimeout(this.connect.bind(this), 5000); //reconnect in 5 seconds
            }

            //all auctions connections need to be cleared so we can connect again
            this.auctionsByKey = {};

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
         * An error occurred on the socket. Log it and pass it through
         *
         * @param err
         */
        onError: function (e) {
            this.emit('error', e.data);
            this.handleReconnect();
        },

        /**
         * Pass through disconnect event.
         *
         * @param e
         */
        onDisconnect: function (e) {
            //so we have an error object
            e.set('error', new Error('disconnected'));
            this.emit('disconnect', e.data);
            this.handleReconnect();
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

            this.emit('connect', {
                handbid: this,
                options: this.options,
                url:     this.options.url
            });

            if (this._auctionOnLoad) {
                this.connectToAuction(this._auctionOnLoad.key, this._auctionOnLoad.options, this._auctionOnLoad.callback);
            }

        },

        deleteCreditCard: function (creditCardId, callback) {

            this._socket.emit('delete-credit-card', {
                id: creditCardId
            }, function (err, results) {

                callback(err, results);
            });

        },


        /**
         * Pass an event from our socket through to anyone listening
         * @param e
         * @private
         */
        _eventPassthrough: function (e) {
            this.emit(e.name, e.data);
        },

        isConnected: function () {
            return this._socket && this._socket.isConnected();
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
         * Connect to any auction by key (will set the auction key)
         *
         * @param auctionKey
         * @param options
         */
        connectToAuction: function (auctionKey, options, callback) {

            var _options,
                _callback = typeof options === 'function' ? options : callback;

            if (typeof options === 'function') {
                options = {};
            }

            _options = merge(this.options, options || {});

            //cached auctions only trigger callback (not global did-connect)
            if (this.auctionsByKey[auctionKey]) {

                if(_callback) {
                    _callback(null, this.auctionsByKey[auctionKey]);
                }

                return false;
            }

            if (!this._socket || !this._socket.isConnected()) {

                this._auctionOnLoad = { key: auctionKey, options: _options, callback: _callback };

            } else {

                this._socket.emit('connect-to-auction', {
                    auctionKey: auctionKey
                }, function (error, response) {

                    if (error) {

                        console.error(error);
                        return _callback ? _callback(error) : null;
                    }

                    var __options = merge({
                        io: this._io,
                        Adapter: this._Adapter,
                        Event: this.Event,
                        'force new connection': true,
                        reconnect: false
                    } ,merge(_options, response)),
                        auction = new Auction(__options);


                    auction.on('did-connect', this.onDidConnectToAuction.bind(this));

                    auction.connect(_callback);

                    this.auctions.push(auction);
                    this.auctionsByKey[auctionKey] = auction;


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

                    if(!cb) {
                        console.error(err);
                    } else {
                        cb(err);
                    }

                } else {

                    this.authenticated  = true;
                    this.authString     = authString;
                    this.user           = user;

                    //set auth on every auction
                    var i = 0,
                        remaining = this.auctions.length,
                        done = function () {

                            remaining--;
                            if(remaining <= 0 && cb) {
                                cb(err, user);
                            }

                            if(remaining <= 0) {

                                this.emit('authenticated', {
                                    user: user,
                                    handbid: this
                                });

                            }

                        }.bind(this);

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

                cb(err, user);

            });

        },

        getUserAuctions: function (user, query, cb) {

            var data = {
                user: user,
                query: {
                    limit: query['limit'] || 10,
                    skip:  query['skip']  || undefined
                }
            };

            this._socket.emit('get-bidder-auctions', data, function (err, auctions) {

                cb(err, auctions);

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

            var auction = e.get('auction');

            if(this.authenticated) {
                auction.setAuth(this.authString);
            }

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
        authString:     '',
        user:           null,
        construct: function (options) {

            this.options    = options;
            this.Event      = options.Event;

            if(!this.options.io || !this.options.Adapter || !this.options.Event || !this.options.url) {
                throw new Error('You should probably not construct a new Auction manually.');
            }

            this.inherited();

        },

        /**
         * Connects to the auction server. You should never need to invoke this directly. Instead, use handbid.connectToAuction
         *
         * @param options
         * @param callback
         * @returns {null}
         */
        connect: function (options, callback) {

            var _options,
                _callback = (typeof options === 'function') ? options : callback;

            if (typeof options === 'function') {
                options = {};
            }


            this.options = merge(this.options, options || {});

            _options = merge(this.options, {}); // make a copy because socket.io mutates parameters


            if(!this._socket) {

                this._socket = new _options.Adapter({ io: _options.io });

                //auction socket listeners
                this._socket.on('connect', this.onDidConnect.bind(this));
                this._socket.on('error', this.onError.bind(this));
                this._socket.on('disconnect', this.onDisconnect.bind(this));

                if (_callback) {
                    this.on('did-connect', function (e) {
                        _callback(null, e.get('auction'));
                    });
                }

                this._socket.on('did-update-auction', this.onDidUpdate.bind(this));
                this._socket.on('did-update-item', this._eventPassthrough.bind(this));
                this._socket.on('did-update-stats', this._eventPassthrough.bind(this));
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

        /**
         * Make a purchase of an item
         *
         * @param itemKey
         * @param quantity
         * @param amount
         * @param callback
         */
        purchase: function (itemKey, quantity, amount, callback) {

            if(typeof amount === 'function') {
                callback = amount;
                amount = null;
            }

            this._socket.emit('purchase', {
                itemKey: itemKey,
                amount: amount,
                quantity: quantity
            }, function (err, results) {
                //we get back the results of our purchase request here, process, and send it back to our caller.
                //be aware, there are many ways this can fail-- we might try to purchase an item who's buy it now price has change, we might be trying to purchase an unpurchasable, or hidden item, we might be trying to buy an item that doesn't exist, we could be trying to buy an item from an auction that is not open, etc.
                callback(err, results);
            });

        },

        /**
         * Buy any item by key
         *
         * @param itemKey
         * @param callback
         */
        buyItNow: function (itemKey, callback) {

            this._socket.emit('buy-it-now', {
                itemKey: itemKey
            }, function (err, results) {

                callback(err, results);
            });

        },

        /**
         * Bid on any item by key
         *
         * @param itemKey
         * @param amount
         * @param isProxy
         * @param callback
         */
        bid: function (itemKey, amount, isProxy, callback) {

            this._socket.emit('bid', {
                itemKey: itemKey,
                amount: amount,
                isProxy: isProxy
            }, function (err, results) {
                //we get back the results of our bid request here, process, and send it back to our caller.
                callback(err, results);
            });

        },

        /**
         * Delete a proxy bid by its id
         *
         * @param proxyBidId
         * @param callback
         */
        deleteProxyBid: function (proxyBidId, callback) {

            this._socket.emit('delete-proxy-bid', {
                id: proxyBidId
            }, function (err, results) {

                callback(err, results);
            });

        },

        /**
         * Called internally anytime an auction is updated, mixes in changes, then fires true update events.
         *
         * @param e
         */
        onDidUpdate: function (e) {

            var updates = e.get('changes');

            Object.keys(updates).forEach(function (key) {
                this.values[key] = updates[key];
            }, this);

            this.emit('did-update', {
                auction: this,
                changed: updates
            });

            this.emit('update', {
                auction: this,
                changed: updates
            });

        },

        /**
         * An error occurred on the socket. Log it and pass it through
         *
         * @param err
         */
        onError: function (e) {
            this.emit('error', e.data);
            this.handleReconnect();
        },

        /**
         * Pass through disconnect event.
         *
         * @param e
         */
        onDisconnect: function (e) {
            //so we have an error object
            e.set('error', new Error('disconnected'));
            this.emit('disconnect', e.data);
            this.handleReconnect();
        },

        /**
         * Reconnect after 5 seconds
         */
        handleReconnect: function () {

            //special work needs to be done to make sure the auction server is running before we try and reconnect
            //so for now the handbid class handles all reconnect attempts so it can resolve the proper auction endpoint

            //
            //if (this._reconnectTimeout) {
            //    this._reconnectTimeout = clearTimeout(this._reconnectTimeout);
            //}
            //
            //if(!this._socket || !this._socket.isConnected()) {
            //    this._reconnectTimeout = setTimeout(this.connect.bind(this), 5000); //reconnect in 5 seconds
            //}

        },

        /**
         * Get a value off the auction.
         *
         * @param name
         * @param defaultValue
         * @returns {*}
         */
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
                });

                this.emit('connect', {
                    auction: this,
                    handbid: this
                });

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

        /**
         * Force disconnect from this auction
         *
         * @param cb
         */
        disconnect: function (cb) {

            if (this._socket) {
                this._socket.disconnect(cb);
            } else {
                cb();
            }
        },

        /**
         * Helps us tell if we are connected.
         *
         * @returns {null|*|boolean}
         */
        isConnected: function () {
            return this._socket && this._socket.isConnected();
        },

        /**
         * Get all the items in this auction
         *
         * @param cb
         */
        items: function (cb) {

            this._socket.emit('items', function (err, items) {

                if(err) {
                    err = new Error(err);
                }

                cb(err, items);

            });
        },

        /**
         * Get details on any item by id
         *
         * @param key
         * @param cb
         */
        item: function (key, cb) {

            this._socket.emit('item-by-key', key, function (err, item) {

                if(err) {
                    err = new Error(err);
                }

                cb(err, item);

            });
        },

        /**
         * Lists out all tickets
         *
         * @param cb
         */
        tickets: function (cb) {

            this._socket.emit('tickets', function (err, tickets) {

                if (err) {
                    err = new Error(err);
                }

                cb(err,tickets);

            });

        },

        /**
         * Gets you stats for this auction and the logged in user.
         *
         * @param cb
         */
        stats: function (cb) {

            this._socket.emit('stats', function (err, stats) {

                if (err) {
                    err = new Error(err);
                }

                cb(err, stats);

            });

        },

        /**
         * Purchase a ticket by id
         *
         * @param ticketId
         * @param quantity
         * @param cb
         */
        purchaseTicket: function (ticketId, quantity, cb) {

            this._socket.emit('purchase-ticket', {
                ticketId: ticketId,
                quantity:  quantity
            }, function (err, purchases) {

                if (err) {
                    err = new Error(err);
                }

                cb(err, purchases);


            });

        },


        /**
         * A user can join an auction here. If no user is set, the authenticated in user is assumed.
         *
         * @param userId
         * @param cb
         */
        join: function (userId, cb) {


            if (!cb) {
                cb = userId;
                userId = this.user._id || false;
            }

            if (!userId) {
                if(cb) {
                    cb(new Error('You must be logged in or pass a user id to add someone to an auction.'));
                }
                return;
            }

            this._socket.emit('join', {
                userId: userId
            }, function (err) {

                if (err) {
                    err = new Error(err);
                }

                if(cb) {
                    cb(err);
                }

            });

        },


        /**
         * Sets the auth string for this connection
         *
         * @param authString
         * @param cb
         */
        setAuth: function (authString, cb) {

            this._socket.emit('authenticate', authString, function (err, user) {

                if(err) {

                    err = new Error(err);

                    //no callback set, BAIL
                    if(!cb) {
                        console.error(err);
                        return;
                    }

                } else {
                    this.user          = user;
                    this.authString    = authString;
                    this.authenticated = true;
                }

                if(cb) {
                    cb(err, user);
                }

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