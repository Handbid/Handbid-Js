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

            Object.keys(changes).forEach(function (attributeName) {

                if (typeof changes[attributeName] === 'object') {

                    Object.keys(changes[attributeName]).forEach(function (key) {

                        selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '.' + key + '"]';
                        $(selector).html(changes[attributeName][key]);

                    }, this);


                } else {

                    selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '"]';
                    $(selector).html(changes[attributeName]);
                }

            }, this);

        });

        auction.on('did-create-item', function (e) {

            handbid.alert('A new item was added to the auction called ' + e.get('values').name);

        });

    });

})(typeof jQuery === 'undefined' ? false : jQuery);