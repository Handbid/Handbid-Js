(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/profile');
        return;
    }


    function getQueryVariable(variable)
    {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == variable){return pair[1];}
        }
        return(false);
    }

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length == 2) return parts.pop().split(";").shift();
    }

    $(document).ready(function () {

        //is there a handbid-auth in the query string?
        var authQuery   = getQueryVariable('handbid-auth'),
            authCookie  = getCookie('handbid-auth'),
            auth        = authQuery || authCookie;

        if(auth) {

            auth = decodeURIComponent(auth);

            if(handbid.isConnected()) {
                handbid.setAuth(auth);
            } else {
                handbid.on('did-connect-to-server', function () {
                    handbid.setAuth(auth);
                })
            }

        }



    });


})(typeof jQuery === 'undefined' ? false : jQuery);