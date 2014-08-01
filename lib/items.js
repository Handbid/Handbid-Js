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
                changes      = e.get('changes');

            Object.keys(changes).forEach(function (attributeName) {

                var selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '"]';
                $(selector).html(changes[attributeName]);

            }, this);

        });

    });

})(typeof jQuery === 'undefined' ? false : jQuery);