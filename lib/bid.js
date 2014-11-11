(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/bid');
        return;
    }

    var BidWidget = function (node, auction) {

        this.node = node;

        this.attachNodes();
        this.setupListeners();

        this.btnDown.hide();
        this.btnUp.hide();


        if (auction) {
            this.setAuction(auction);
        }

    };

    BidWidget.prototype = {
        item: null,
        bidAmount: 0,
        bidAmountNode: null,
        quantity: 1,
        quantityNode: null,
        btnUp: null,
        btnDown: null,
        setAuction: function (auction) {

            this.btnDown.show();
            this.btnUp.show();

            this.auction = auction;
            this.setupAuctionListener();
            this.refreshItem();

            return this;
        },

        setupAuctionListener: function () {

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

        setupListeners: function () {

            this.btnUp.click(this.up.bind(this));
            this.btnDown.click(this.down.bind(this));
            $('[data-handbid-bid-button="bid"]', this.node).click(this.bid.bind(this));
            $('[data-handbid-bid-button="proxy"]', this.node).click(this.proxy.bind(this));
            $('[data-handbid-bid-button="purchase"]', this.node).click(this.purchase.bind(this));
            $('[data-handbid-bid-button="buyItNow"]', this.node).click(this.buyItNow.bind(this));


        },

        up: function (e) {

            e.preventDefault();

            if (this.item) {

                if (this.item.isDirectPurchaseItem) {

                    this.setQuantity(this.quantity + 1);

                } else {

                    this.setBidAmount(this.bidAmount + this.item.bidIncrement);
                }
            }

        },

        down: function (e) {

            e.preventDefault();

            if (this.item) {

                if (this.item.isDirectPurchaseItem) {

                    this.setQuantity(this.quantity - 1);

                } else {

                    this.setBidAmount(this.bidAmount - this.item.bidIncrement);
                }

            }

        },

        attachNodes: function () {

            this.bidAmountNode = $('[data-handbid-bid-amount]', this.node);
            this.quantityNode = $('[data-handbid-quantity]', this.node);

            this.btnUp = $('[data-handbid-bid-button="up"]', this.node);
            this.btnDown = $('[data-handbid-bid-button="down"]', this.node);

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
                    handbid.error('I could not find this item on the server. How in the world did that happen?');
                }


            }.bind(this));

        },

        showProgress: function (message) {

            var selector = $(this.node);
            handbid.progress(message, selector);

        },

        hideProgress: function () {

            var selector = $(this.node);
            handbid.hideProgress(selector);
        },

        bid: function (e) {

            e.preventDefault();

            if (this.authCheck()) {

                handbid.confirm('Submit bid for $' + this.bidAmount + '?', function (pass) {

                    if (pass) {

                        this.showProgress('Submitting Bid...');

                        this.auction.bid(this.item.key, this.bidAmount, false, function (err, bid) {

                            if (err) {

                                this.hideProgress();
                                handbid.error(err);
                            } else {

                                handbid.notice('Bid saved for $' + bid.amount + '. Refreshing page now.', function () {
                                    handbid.refreshPage();
                                });
                            }

                        }.bind(this));

                    }

                }.bind(this));
            }

        },

        buyItNow: function (e) {

            e.preventDefault();

            if (this.authCheck()) {

                handbid.confirm('Buy it now for $' + this.item.buyNowPrice + '?', function (pass) {

                    if (pass) {

                        this.showProgress('Buying now...');

                        this.auction.buyItNow(this.item.key, function (err, bid) {

                            if (err) {

                                this.hideProgress();
                                handbid.error(err);
                            } else {

                                handbid.notice('You bought ' + this.item.name + ' for $' + bid.amount + '. Refreshing page now.', function () {
                                    handbid.refreshPage();
                                });
                            }

                        }.bind(this));

                    }

                }.bind(this));
            }

        },

        purchase: function (e) {
            e.preventDefault();


            if (this.authCheck()) {

                var total = this.quantity * this.item.buyNowPrice;

                handbid.confirm('Purchase ' + this.quantity + ' for $' + total + '?', function (pass) {

                    if (pass) {

                        this.showProgress('Making Purchase...');

                        this.auction.purchase(this.item.key, this.quantity, function (err, response) {

                            if (err) {

                                this.hideProgress();
                                handbid.error(err);

                            } else {

                                handbid.notice('Purchase made for $' + total + '. Refreshing the page now.', function () {
                                    handbid.refreshPage();
                                });
                            }

                        }.bind(this));

                    }

                }.bind(this));

            }

        },

        proxy: function (e) {

            e.preventDefault();

            if (this.authCheck()) {

                handbid.confirm('Submit max bid for $' + this.bidAmount + '?', function (pass) {

                    if (pass) {

                        this.showProgress('Submitting Max Bid...');

                        this.auction.bid(this.item.key, this.bidAmount, true, function (err, bid) {

                            if (err) {

                                this.hideProgress();
                                alert(err);

                            } else {

                                handbid.notice('Max bid saved. You are winning the item at $' + bid.amount + '. Refreshing the page now.', function () {
                                    handbid.refreshPage();
                                });

                            }

                        }.bind(this));

                    }


                }.bind(this));


            }

        },

        authCheck: function () {

            if(!this.auction) {
                alert('I was unable to connect to the auction. Bidding is down. Try again in a few seconds.');
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

        setBidAmount: function (amount) {
            if (amount >= this.item.minimumBidAmount) {
                this.bidAmount = amount;
                $(this.bidAmountNode).html(amount);
            }
        },


        setQuantity: function (quantity) {
            if (quantity > 0) {
                this.quantity = quantity;
                $(this.quantityNode).html(quantity);
            }
        }

    };

    //create all bid boxes!
    var bidBoxes = [];

    $('[data-handbid-bid]').each(function (index) {
        var w = new BidWidget(this);
        bidBoxes.push(w);
    });


    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        //update auction on all bid boxes
        bidBoxes.forEach(function (bidBox) {
            bidBox.setAuction(auction);
        }, this);


        $('[data-handbid-delete-proxy]').click(function (e) {

            var proxyBidId = $(this).attr('data-handbid-delete-proxy');

            e.preventDefault();

            handbid.confirm('Are you sure you want to delete your max bid?', function (pass) {

                if (pass) {

                    auction.deleteProxyBid(proxyBidId, function (err) {

                        if (err) {
                            handbid.error(err);
                        } else {

                            handbid.notice('Your proxy bid has been deleted.', function () {

                                handbid.refreshPage();

                            });
                        }

                    });

                }

            }.bind(this));


        });

    });


})(typeof jQuery === 'undefined' ? false : jQuery);