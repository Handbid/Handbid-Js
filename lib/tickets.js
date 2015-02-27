(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/tickets');
        return;
    }

    var TicketWidget = function (node, auction) {

        this.node           = node;
        this.ticketControls = [];

        this.createTicketControls();
        this.attachNodes();
        this.setupListeners();

        if (auction) {
            this.setAuction(auction);
        }

    };

    TicketWidget.prototype = {

        purchaseButtonNode: null,
        ticketControls:     null,
        setAuction: function (auction) {

            this.auction = auction;
            return this;
        },

        attachNodes: function () {

            this.totalNode = $('[data-handbid-tickets-total]', this.node);

        },

        createTicketControls: function () {

            var me = this;

            $('[data-handbid-ticket-id]').each(function () {


                var controls = new TicketControls(me, this);
                me.ticketControls.push(controls);


            });

        },

        authCheck: function () {

            if (!this.auction) {
                alert('I was unable to connect to the auction. Try again in a few seconds.');
            }

            else if (this.auction.authenticated) {
                return true;
            } else {

                handbid.confirm('You must be connected to Handbid to participate. Would you like to do that now?', function (pass) {
                    if (pass) {
                        handbid.redirectToConnect();
                    }
                });

            }

            return false;

        },

        onQuantityChange: function (controls) {

            this.totalNode.html(this.calculateTotal());

        },

        calculateTotal: function () {

            var total = 0;

            this.ticketControls.forEach(function (control) {
                total += (control.quantity * control.price);
            }, this);

            return total;

        },

        showProgress: function (message) {

            var selector = $(this.node);
            handbid.progress(message, selector);

        },

        hideProgress: function () {

            var selector = $(this.node);
            handbid.hideProgress(selector);

        },

        calculateQuantity: function () {

            var quantity = 0;

            this.ticketControls.forEach(function (control) {
                quantity += control.quantity;
            }, this);

            return quantity;

        },

        setupListeners: function () {
            $('[data-handbid-tickets-button="purchase"]', this.node).click(this.purchase.bind(this));
        },

        purchase: function (e) {

            if (e) {
                e.preventDefault();
            }

            if (!this.authCheck()) {
                return;
            }

            var total = this.calculateTotal(),
                quantity = this.calculateQuantity();

            if (quantity > 0) {

                handbid.confirm('Are you sure you want to purchase ' + quantity + ' tickets for $' + total + '?', function (pass) {

                    if (pass) {


                        var purchaseNext = function (i) {

                            if (i >= this.ticketControls.length) {

                                //we are done
                                handbid.notice('Tickets purchased for $' + total + '. Refreshing the page now.', function () {
                                    handbid.refreshPage();
                                });

                                return;

                            }

                            if (this.ticketControls[i].quantity > 0) {

                                this.auction.purchaseTicket(this.ticketControls[i].ticketId, this.ticketControls[i].quantity, function (err, purchase) {

                                    if (err) {
                                        this.hideProgress();
                                        handbid.error(err);
                                    } else {
                                        purchaseNext(++i);
                                    }

                                }.bind(this));

                            } else {

                                purchaseNext(++i);
                            }


                        }.bind(this);


                        //purchase starting from the first
                        purchaseNext(0);
                        this.showProgress('Purchasing tickets...');

                    }

                }.bind(this));


            } else {

                handbid.alert('You must select at least 1 ticket.');

            }



        }


    };

    var TicketControls = function (parent, node) {

        this.parent     = parent;
        this.node       = node;
        this.price      = parseInt($(node).attr('data-handbid-ticket-price'));
        this.ticketId   = $(node).attr('data-handbid-ticket-id');

        this.attachNodes();


    };

    TicketControls.prototype = {
        parent:     null,
        node:       null,
        quantity:   0,
        price:      0,
        ticketId:   null,
        attachNodes: function () {

            this.btnUp = $('[data-handbid-ticket-button="up"]', this.node).click(this.up.bind(this));
            this.btnDown = $('[data-handbid-ticket-button="down"]', this.node).click(this.down.bind(this));
            this.quantityNode = $('[data-handbid-ticket-quantity]', this.node);

        },

        up: function (e) {

            e.preventDefault();

            this.quantity ++;
            this.setQuantity(this.quantity);
        },

        down: function (e) {

            e.preventDefault();

            this.quantity = Math.max(0, this.quantity - 1);
            this.setQuantity(this.quantity);

        },

        setQuantity: function (quantity) {

            this.quantity = quantity;
            $(this.quantityNode).html(quantity);
            this.parent.onQuantityChange(this);

        }

    };

    //create all bid boxes!
    var ticketBoxes = [];

    $('[data-handbid-tickets]').each(function (index) {
        var w = new TicketWidget(this);
        ticketBoxes.push(w);
    });


    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        //update auction on all bid boxes
        ticketBoxes.forEach(function (ticketBox) {
            ticketBox.setAuction(auction);
        }, this);


    });

})(typeof jQuery === 'undefined' ? false : jQuery);