(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/bid');
        return;
    }

    var BidWidget = function (node, auction) {

        this.node = node;
        this.auction = auction;

        this.setupListeners();
        this.attachNodes();

        this.refreshItem();

    };

    BidWidget.prototype = {
        item:           null,
        bidAmount:      0,
        bidAmountNode:  null,
        setupListeners: function () {

            $('[data-handbid-bid-button="up"]', this.node).click(this.up.bind(this));
            $('[data-handbid-bid-button="down"]', this.node).click(this.down.bind(this));
            $('[data-handbid-bid-button="bid"]', this.node).click(this.bid.bind(this));
            $('[data-handbid-bid-button="proxy"]', this.node).click(this.proxy.bind(this));

            //setup update events on all connected auctions
            var auctions = handbid.auctions,
                i = 0;

            for (i; i < auctions.length; i = i + 1) {

                auctions[i].on('did-update-item', function (e) {

                    var key = e.get('key'),
                        changes = e.get('changes');

                    if (key === this.item.key && changes.minimumBidAmount) {
                        this.setBidAmount(changes.minimumBidAmount);
                    }

                }.bind(this));

            }


        },

        up: function (e) {

            e.preventDefault();

            if (this.item) {
                this.setBidAmount(this.bidAmount + this.item.bidIncrement);
            }

        },

        down: function (e) {

            e.preventDefault();

            if (this.item) {
                this.setBidAmount(this.bidAmount - this.item.bidIncrement);
            }

        },

        attachNodes: function () {

            this.bidAmountNode = $('[data-handbid-bid-amount]', this.node);
        },

        refreshItem: function () {

            var itemKey = $(this.node).attr('data-handbid-item-key');

            this.auction.item(itemKey, function (err, item) {
                if (err) {
                    console.error(err);
                } else if (item) {
                    this.item = item;
                    this.setBidAmount(item.minimumBidAmount);
                } else {
                    handbid.alert('I could not find this item on the server. How in the world did that happen?');
                }


            }.bind(this));

        },

        showProgress: function (message) {

            var selector = '[data-handbid-item-key="' + this.item.key + '"]';
            handbid.progress(message, selector);

        },

        hideProgress: function () {

            var selector = '[data-handbid-item-key="' + this.item.key + '"]';
            handbid.hideProgress(selector);
        },

        bid: function () {

            if (this.authCheck()) {

                if (confirm('Submit bid for $' + this.bidAmount + '?')) {

                    this.showProgress('Submitting Bid!...');

                    this.auction.bid(this.item.key, this.bidAmount, false, function (err, bid) {

                        if (err) {
                            handbid.alert(err);
                        } else {
                            handbid.alert('Bid saved for $' + bid.amount + '.', function () {
                                handbid.refreshPage();
                            });
                        }

                    });

                }
            }

        },

        proxy: function () {

            if (this.authCheck()) {

                if (confirm('Submit max bid for $' + this.bidAmount + '?')) {

                    this.showProgress('Submitting Max Bid...');

                    this.auction.bid(this.item.key, this.bidAmount, true, function (err, bid) {

                        if (err) {
                            alert(err);
                        } else {
                            handbid.alert('Max bid saved. You are winning the item at $' + bid.amount + '.', function () {
                                handbid.refreshPage();
                            });
                        }

                    });

                }


            }

        },

        authCheck: function () {

            if (this.auction.authenticated) {
                return true;
            } else {

                if (confirm('You must be connected to Handbid to participate. Would you like to do that now?')) {
                    handbid.redirectToConnect();
                }
            }

            return false;

        },

        setBidAmount: function (amount) {
            if (amount >= this.item.minimumBidAmount) {
                this.bidAmount = amount;
                $(this.bidAmountNode).html(amount);
            }
        }
    };

    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        $('[data-handbid-bid]').each(function (index) {

            var w = new BidWidget(this, auction);

        });

        $('[data-handbid-delete-proxy]').click(function (e) {

            var proxyBidId = $(this).attr('data-handbid-delete-proxy');

            e.preventDefault();

            if (confirm('Are you sure you want to delete your max bid?')) {

                auction.deleteProxyBid(proxyBidId, function (err) {

                    if (err) {
                        handbid.alert(err);
                    } else {

                        handbid.alert('Your proxy bid has been deleted.', function () {

                            handbid.refreshPage();

                        });
                    }

                });

            }

        });

    });


})(typeof jQuery === 'undefined' ? false : jQuery);