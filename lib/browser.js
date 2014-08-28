(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/browser');
        return;
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
    handbid.alert = function (msg, cb) {
        alert(msg);
        cb();
    };



})(typeof jQuery === 'undefined' ? false : jQuery);