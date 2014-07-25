(function ($) {

    "use strict";

    if(!$) {
        console.error('You must have jQuery for handbid-js to work properly in the browser.');
        return;
    }

    handbid.on('did-connect-to-auction', function (auction) {

        auction.on('did-update-item', function (e) {

            var baseSelector = '[data-handbid-item-key="' + e.get('key') + '"]',
                changes      = e.get('changes');

            Object.keys(changes).forEach(function (attributeName) {

                var selector = baseSelector + ' [data-handbid-item-attribute="' + attributeName + '"]';
                $(selector).html(changes[attributeName]);

            }, this);

        });

    });

})(jQuery);