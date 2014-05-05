Handbid-Connect
===============

Drop a snazzy "connect to handbid" button on your pages.

## Step 1 - Drop in js loader

```js
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//hbs.local/local/vendor/Handbid/Module/Apps/public/js/connect.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'hb-jssdk'));

```

## Step 2 - Drop in button
You can use any element you want, just give it a data-hb-connect="true" attribute.

```html
<a href="/redirect/destination" data-hb-connect="true">Connect to Handbid</a>
```