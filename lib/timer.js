(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/timer');
        return;
    }


    var Timer = function (stepCallback, completionCallback) {

        this.dateOffset = 0;
        this.stepCallback = stepCallback;
        this.completionCallback = completionCallback;
        this.running = false;
        this.expired = false;
        this.endDate = null;

    };

    Timer.prototype = {

        /**
         * Set this with a time given by the server so timers can be more accurate
         *
         * @param value
         * @returns {Timer}
         */
        setCurrentDate: function (value) {
            this.dateOffset = new Date() - value;
            return this;
        },


        start: function (endDate) {

            if (endDate) {
                this.endDate = endDate;
            }

            if (!this.expired) {
                this.running = true;
                this.step();
            }

            return this;
        },

        step: function () {

            //if timeouts are getting doubled up (from calling start() too often)
            if (this.timeout) {
                this.timeout = clearTimeout(this.timeout);
            }

            if (this.expired) {
                return;
            }

            //take into account offset if we need to
            var now = (this.dateOffset > 0) ? new Date(new Date() - this.dateOffset) : new Date(),
                end = this.endDate,
                diff,
                time;

            //we can never be in the past
            if (now > end) {
                end = now;
                this.expired = true;
                this.onComplete();
            } else {
                this.timeout = setTimeout(this.step.bind(this), 1000);
            }

            diff = end - now;
            time = this.secondsToTime(diff);

            this.stepCallback(time, diff);

        },

        secondsToTime: function (secs) {
            secs = Math.round(secs);
            var hours = Math.floor(secs / (60 * 60)),
                divisor_for_minutes = secs % (60 * 60),
                minutes = Math.floor(divisor_for_minutes / 60),
                divisor_for_seconds = divisor_for_minutes % 60,
                seconds = Math.ceil(divisor_for_seconds);

            return {
                h: hours,
                m: minutes,
                s: seconds
            };
        },

        stop: function () {
            return this;
        },

        onComplete: function () {
            this.completionCallback(this);
        }

    };

    $(document).ready(function () {

        var timers = [],
            $timers = $('[data-handbid-timer]'),
            go = function (auction) {

                console.log('go go captain planet!', auction.values);


            };

        //hide all timers to start
        $timers.hide();

        handbid.on('did-connect-to-auction', function (e) {

            var auction = e.get('auction');

            go(auction);
            auction.on('update', function (e) {
                go(e.get('auction'));
            });

        });




    });


})(typeof jQuery === 'undefined' ? false : jQuery);