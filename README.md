#Handbid-Js

I am the `Handbid-Js` library. I work in both [nodejs](http://nodejs.org) && in the browser. I rely on [chai](http://chaijs.com)
for my tests. To be honest, I've never run any unit tests in the browser, someone should figure out how to do that. =)

##Lifecycle
Connecting to an auction in Handbid is a multi-step process. It's pretty simple though, here is a breakdown:

1. Instantiate new Handbid instance: `var hb = new Handbid()`
1. Connect to the `main` server by invoking: `hb.connect();`
1. Connect to any auction by key by invoking: `hb.connectToAuction('any-auction-key');`
1. Listen for auction connection: `hb.on('did-connect-to-auction', function (e) { console.log(e.get('auction')); });`

You can invoke `connectToAuction()` immediately after `connect()` (you don't have to wait for the main connection to be established).

##Examples
Here are some code samples to get you started!

###Browser
```html

<script type='text/javascript' src='http://handbid-js.local/handbid-js.js'></script>

<script type="text/javascript">

    /**
     * From the browser, a few operations are automatically performed for you. They are as follows:
     *
     * window.handbid = new Handbid();
     * window.handbid.connect();
     *
     * So, automatically, you will be connected to the main Handbid server. But, you will not be able to listen in on any
     * fancy update events. For
     */
    handbid.connectToAuction('handbid-demo-auction');
    handbid.on('did-connect-to-auction', function (e) {

        var auction = e.get('auction');

        auction.on('did-update-item', function (e) {

            var itemKey = e.get('key'),
                changes = e.get('changes');

            console.log('the following was changed:', changes, 'on item with key:', itemKey);

        });

        auction.on('did-update-auction', function (e) {

            console.log(e);

        });

    });


</script>

```

###Nodejs
```bash
$npm install handbid-js
```

```js

var Handbid = require('handbid'),
    hb      = new Handbid();

hb.connect();
hb.connectToAuction('auction key');

//from this point it's exactly the same as the browser examples.


```

##Events
Under each event name is a description of the data passed with the event. This event is the single object passed to a
listener of any event.

`Handbid`

- `did-connect-to-server`: when a server connection is made after invoking `hb.connect()`
    - `handbid`: instance that dispatched the event
    - `url`: the url we connected to
- `did-connect-to-auction`: dispatched after `hb.connectToAuction('auction-key')`
    - `handbid`: instance that dispatched the event
    - `auction`: the auction we connected to
- `did-receive-message`: whenever the current user gets a message
    - `message`: text of message that was sent
- `error`: anytime any error occurs