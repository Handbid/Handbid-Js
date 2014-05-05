Handbid-Connect
===============

Drop a snazzy "connect to handbid" button on your pages.

```js
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//hbs.local/local/vendor/Handbid/Module/Apps/public/js/connect.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'hb-jssdk'));

```