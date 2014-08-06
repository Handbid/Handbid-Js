(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/connect');
        return;
    }

    var endpoint = handbid.connectEndpoint;

    $(document).ready(function () {

        $('[data-handbid-connect]').click(function (e) {

            e.preventDefault();
            var pass = $(this).attr('data-handbid-pass'),
                fail = $(this).attr('data-handbid-fail');

            handbid.redirectToConnect(pass, fail);

        });

    });

    handbid.redirectToConnect = function (pass, fail) {

        var url;

        if (!pass) {
            pass = '';
        }

        if (!fail) {
            fail = '';
        }

        //drop in protocol & host if necessary
        pass = pass.search(/http/) === -1 ? window.location.href : pass;
        fail = fail.search(/http/) === -1 ? window.location.href : pass;

        url = endpoint + '?pass=' + encodeURIComponent(pass) + '&fail=' + encodeURIComponent(fail);

        window.location.href = url;
    };

    //hide the button on authenticated event
    handbid.on('authenticated', function (e) {

        $('[data-handbid-connect]').addClass('authenticated hidden');

    });

})(typeof jQuery === 'undefined' ? false : jQuery);