(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/stats');
        return;
    }

    var statSelectors = {
        numProxies:     '[data-handbid-stats-num-proxies]',
        numWinning:     '[data-handbid-stats-num-winning]',
        numLosing:      '[data-handbid-stats-num-losing]',
        numPurchases:   '[data-handbid-stats-num-purchases]',
        grandTotal:     '[data-handbid-stats-grand-total]'
    };


    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        auction.on('did-update-stats', function (e) {

            var key;
            for (key in e.data) {

                if (statSelectors.hasOwnProperty(key)) {
                    $(statSelectors[key]).html(e.data[key]);
                }

            }


        });


    });

})(typeof jQuery === 'undefined' ? false : jQuery);