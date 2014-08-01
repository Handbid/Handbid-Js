(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/connect');
        return;
    }

    var endpoint = 'http://localhost:8080';

    $(document).ready(function () {

        $('[data-handbid-connect]').click(function (e) {

            e.preventDefault();
            var pass = $(this).attr('data-handbid-pass'),
                fail = $(this).attr('data-handbid-fail'),
                url;

            //drop in protocol & host if necessary
            pass = pass.search(/http/) === -1 ? window.location.protocol + '//' + window.location.host : pass;
            fail = fail.search(/http/) === -1 ? window.location.protocol + '//' + window.location.host : pass;

            url = endpoint + '?pass=' + encodeURIComponent(pass) + '&fail=' + encodeURIComponent(fail);

            window.location.href = url;

        });

    });

})(typeof jQuery === 'undefined' ? false : jQuery);