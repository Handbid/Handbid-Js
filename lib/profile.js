(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/profile');
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

    function getCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
    }

    function createCookie(name, value, expires, path, domain) {
        var cookie = name + "=" + escape(value) + ";";

        if (expires) {
            // If it's a date
            if (expires instanceof Date) {
                // If it isn't a valid date
                if (isNaN(expires.getTime())) {
                    expires = new Date();
                }
            }
            else {
                expires = new Date(new Date().getTime() + parseInt(expires) * 1000 * 60 * 60 * 24);
            }

            cookie += "expires=" + expires.toGMTString() + ";";
        }

        if (path) {
            cookie += "path=" + path + ";";
        }

        if (domain) {
            cookie += "domain=" + domain + ";";
        }

        document.cookie = cookie;
    }

    function deleteCookie(name, path, domain) {
        // If the cookie exists
        if (getCookie(name)) {
            createCookie(name, "", -1, path, domain);
        }
    }

    $(document).ready(function () {

        //is there a handbid-auth in the query string?
        var authQuery = getQueryVariable('handbid-auth'),
            authCookie = getCookie('handbid-auth'),
            auth = authQuery || authCookie,
            hash = window.location.hash.replace('#', '');

        if (hash === 'handbid-logout') {
            window.location.hash = '';
            deleteCookie('handbid-auth');
            auth = null;
            window.location.href = window.location.href;
        }

        if (auth) {

            auth = decodeURIComponent(auth);

            if (handbid.isConnected()) {
                handbid.setAuth(auth);
            } else {
                handbid.on('did-connect-to-server', function () {
                    handbid.setAuth(auth);
                });
            }

        }


    });


})(typeof jQuery === 'undefined' ? false : jQuery);