(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/browser');
        return;
    }

    function getQueryVariable(variable) {
        var query = window.location.search.substring(1),
            vars = query.split("&"),
            i, pair;

        for (i = 0; i < vars.length; i ++) {
            pair = vars[i].split("=");
            if (pair[0] === variable) {
                return pair[1];
            }
        }

        return false;
    }

    /**
     * Refreshes the page
     */
    handbid.refreshPage = function () {
        window.location.href = window.location.href;
    };

    /**
     * Puts out an alert on the page
     *
     * @param msg
     * @param cb
     */
    handbid.alert = handbid.notice = handbid.error = function (msg, cb) {
        alert(msg);
        cb();
    };

    /**
     * For progress indicators and overlays
     *
     * @param message
     * @param selector
     */

    handbid.progressTemplate = '<div class="handbid-progress"><span class="message">message goes in .message</span></div>';
    handbid.progressElements = {};
    handbid.progress = function (message, selector) {

        var parent = $(selector),
            prog,
            position;

        if (parent) {

            //create a new progress based off the template if we have not already
            prog = handbid.progressElements[selector] = handbid.progressElements[selector] || $(handbid.progressTemplate).appendTo('body');
            $('.message', handbid.progressElements[selector]).html(message);

            //place the element over the parent
            position = parent.position();

            $(prog).css({
                position: 'absolute',
                left:     position.left,
                top:      position.top,
                width:    parent.outerWidth(),
                height:   parent.outerHeight()
            });
        }


    };

    handbid.hideProgress = function (selector) {

        if (handbid.progressElements[selector]) {

            $(handbid.progressElements[selector]).fadeOut({

                complete: function () {
                    $(handbid.progressElements[selector]).remove();
                    handbid.progressElements[selector] = null;

                }
            });
        }
    };


    $(document).ready(function () {

        var notice = getQueryVariable('handbid-notice'),
            error = getQueryVariable('handbid-error');

        if (notice) {
            handbid.notice(notice);
        }

        if (error) {
            handbid.error(error);
        }

    });

})(typeof jQuery === 'undefined' ? false : jQuery);