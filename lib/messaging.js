(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/messaging');
        return;
    }


    handbid.on('message', function (e) {
        handbid.notice(e.get('message'));
    });



})(typeof jQuery === 'undefined' ? false : jQuery);