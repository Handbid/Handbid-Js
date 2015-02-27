(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/health');
        return;
    }

    var message             = 'Connecting to handbid...',
        alertTemplate       = '<div class="handbid-fatal-error"><span class="icon"></span><span>' + message + '</span></div>',
        alertNode,
        disconnectHandler   = function (e) {

            var error = e.get('error');

            //this is a connection error (socket.io does not give any details)
            if (error.message === 'disconnected' || error.message === 'unknown') {

                if (!alertNode) {

                    alertNode = $('<div/>').html(alertTemplate).contents();
                    $('body').append(alertNode);
                }

                $(alertNode).fadeIn();

            }

        };

    handbid.on('error', disconnectHandler);
    handbid.on('disconnect', disconnectHandler);

    handbid.on('did-connect-to-server', function () {

        if (alertNode) {
            $(alertNode).fadeOut();
        }

    });



})(typeof jQuery === 'undefined' ? false : jQuery);