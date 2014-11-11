(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/items');
        return;
    }

    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        auction.on('did-update-item', function (e) {

            var baseSelector = '[data-handbid-item-key="' + e.get('key') + '"]',
                changes      = e.get('changes'),
                key,
                selector;

            //update item props
            Object.keys(changes).forEach(function (attributeName) {

                if (changes[attributeName] instanceof Array) {

                    changes[attributeName].forEach(function (value, key) {

                        selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '.' + key + '"]';
                        $(selector).html(changes[attributeName][key]);

                    }, this);

                }
                else if (typeof changes[attributeName] === 'object') {

                    Object.keys(changes[attributeName]).forEach(function (key) {

                        selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '.' + key + '"]';
                        $(selector).html(changes[attributeName][key]);

                    }, this);



                } else {

                    selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '"]';
                    $(selector).html(changes[attributeName]);
                }

            }, this);

            //update winning/losing banners
            //are we winning?
            if (handbid.authenticated && changes.winningBidder) {

                //were we winning?
                var wasWinning = $(baseSelector + ' [data-handbid-item-banner="winning"]:visible').length > 0,
                    isWinning  = false,
                    isLosing   = false;

                handbid.profile(function (err, profile) {

                    if (profile) {

                        //are we winning now?
                        isWinning = (profile._id === changes.winningBidder.id);

                        //are we losing
                        isLosing = wasWinning && !isWinning;

                        //to start, hide both winning/losing
                        $(baseSelector + ' [data-handbid-item-banner="winning"], ' + baseSelector + ' [data-handbid-item-banner="losing"]').hide();

                        //are winning?
                        if (isWinning) {

                            $(baseSelector + ' [data-handbid-item-banner="winning"]').show();

                        } else if (isLosing) {

                            $(baseSelector + ' [data-handbid-item-banner="losing"]').show();

                        }

                    }

                });


            }



        });

        auction.on('did-create-item', function (e) {

            handbid.notice('A new item was added to the auction called ' + e.get('values').name);

        });

    });

})(typeof jQuery === 'undefined' ? false : jQuery);