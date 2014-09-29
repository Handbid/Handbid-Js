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

        for (i = 0; i < vars.length; i++) {
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
    handbid.alert = handbid.error = function (msg, cb) {

        alert(msg);

        if (cb) {
            cb();
        }

    };
    /**
     *
     * For notice alerts
     *
     * @param msg
     * @param cb
     */
    handbid.noticeContainer = $('<div class="growl-container"></div>');
    handbid.noticeContainer.appendTo('body');
    handbid.noticeTemplate = '<div class="growl"><div class="message">Notice Message</div></div>';
    handbid.notice = function (msg, cb) {

        var growl = $(handbid.noticeTemplate);
        $('.message', growl).html(msg);
        growl.appendTo(handbid.noticeContainer);

        setTimeout(function() {

            growl.remove();

        }, 5000);

        if (cb) {
            cb();
        }

    };

    /**
     * For progress indicators and overlays
     *
     * @param message
     * @param selector
     */

    var progressTemplate = $('.handbid-progress');
    if(progressTemplate.length > 0) {
        handbid.progressTemplate = progressTemplate[0];
    }
    else
    {
        handbid.progressTemplate = '<div class="handbid-progress"><span class="message">message goes in .message</span></div>';
    }

    //handbid.progressTemplate = '<div class="handbid-progress"><span class="message">message goes in .message</span></div>';
    handbid.progressElements = {};
    handbid.progress = function (message, selector) {

        var parent = $(selector),
            prog;

        if (parent) {

            //create a new progress based off the template if we have not already
            prog = handbid.progressElements[selector] = handbid.progressElements[selector] || $(handbid.progressTemplate).appendTo('body');
            $('.message', handbid.progressElements[selector]).html(message);

            //place the element over the parent
            parent.prepend(prog);

            $(prog).css({
                position: 'absolute',
                top:      0,
                right:    0,
                bottom:   0,
                left:     0,
                zIndex:   10,
                display:  'block'
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

    function urldecode(str) {
        //       discuss at: http://phpjs.org/functions/urldecode/
        //      original by: Philip Peterson
        //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //      improved by: Brett Zamir (http://brett-zamir.me)
        //      improved by: Lars Fischer
        //      improved by: Orlando
        //      improved by: Brett Zamir (http://brett-zamir.me)
        //      improved by: Brett Zamir (http://brett-zamir.me)
        //         input by: AJ
        //         input by: travc
        //         input by: Brett Zamir (http://brett-zamir.me)
        //         input by: Ratheous
        //         input by: e-mike
        //         input by: lovio
        //      bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        //      bugfixed by: Rob
        // reimplemented by: Brett Zamir (http://brett-zamir.me)
        //             note: info on what encoding functions to use from: http://xkr.us/articles/javascript/encode-compare/
        //             note: Please be aware that this function expects to decode from UTF-8 encoded strings, as found on
        //             note: pages served as UTF-8
        //        example 1: urldecode('Kevin+van+Zonneveld%21');
        //        returns 1: 'Kevin van Zonneveld!'
        //        example 2: urldecode('http%3A%2F%2Fkevin.vanzonneveld.net%2F');
        //        returns 2: 'http://kevin.vanzonneveld.net/'
        //        example 3: urldecode('http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a');
        //        returns 3: 'http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a'
        //        example 4: urldecode('%E5%A5%BD%3_4');
        //        returns 4: '\u597d%3_4'

        return decodeURIComponent((str + '')
            .replace(/%(?![\da-f]{2})/gi, function () {
                // PHP tolerates poorly formed escape sequences
                return '%25';
            })
            .replace(/\+/g, '%20'));
    }



    $(document).ready(function () {

        var notice = getQueryVariable('handbid-notice'),
            error = getQueryVariable('handbid-error');

        if (notice) {
            handbid.notice(urldecode(notice));
        }

        if (error) {
            handbid.error(urldecode(error));
        }

    });

})(typeof jQuery === 'undefined' ? false : jQuery);