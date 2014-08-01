(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/connect');
        return;
    }

    $(document).ready(function () {
        $('[data-handbid-connect]')
    });

})(typeof jQuery === 'undefined' ? false : jQuery);