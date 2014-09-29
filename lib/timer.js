(function ($) {

    "use strict";

    if (!$) {
        console.error('You must have jQuery for handbid/lib/timer');
        return;
    }


    var Timer = function (stepCallback, completionCallback) {

        this.stepCallback = stepCallback;
        this.completionCallback = completionCallback;
        this.endDate = null;
        this.startDate = null;
        this.active = false;

    };

    Timer.prototype = {


        start: function (startDate, endDate) {

            this.startDate = startDate;
            this.endDate = endDate;
            this.active = true;

            this.step();

            return this;
        },

        step: function () {

            //if timeouts are getting doubled up (from calling start() too often)
            if (this.timeout) {
                this.timeout = clearTimeout(this.timeout);
            }

            if (!this.active) {
                return;
            }

            //take into account offset if we need to
            var now = new Date(),
                end = this.endDate,
                remaining = this.dateDiff(now, end),
                progress = (now - this.startDate) / (end - this.startDate),
                time;


            console.log('progress', progress);

            //we can never be in the past
            if (remaining <= 0) {

                this.active = false;
                this.onComplete();

            } else {

                this.timeout    = setTimeout(this.step.bind(this), 1000);
                time            = this.secondsToTime(remaining / 1000);

                this.stepCallback(time, remaining);
            }



        },

        dateDiff: function (a, b) {

            // Discard the time and time-zone information.
            var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate(), a.getHours(), a.getMinutes(), a.getSeconds());
            var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), b.getHours(), b.getMinutes(), b.getSeconds());

            return utc2 - utc1;
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

    var tick = function (timerNode, time) {

        $('[data-handbid-timer-label="hours"]', timerNode).html(time.h);
        $('[data-handbid-timer-label="minutes"]', timerNode).html(time.m);
        $('[data-handbid-timer-label="seconds"]', timerNode).html(time.s);

    };

    $(document).ready(function () {

        var timers = [],
            $timers = $('[data-handbid-timer]'),
            go = function (auction) {

                //clear all timers
                timers.forEach(function (timer) {
                    timer.stop();
                });

                timers = [];

                if (auction.values.status === 'ending') {

                    $timers.each(function () {

                        var timer,
                            startedAt = new Date(auction.values.timerStartTime * 1000),
                            closesAt = new Date(auction.values.closingTime * 1000);

                        console.log(auction);


                        if (closesAt > new Date()) {

                            timer = new Timer(function (time) {

                                tick(this, time);

                            }.bind(this), function () {

                                alert('done');

                            }.bind(this));

                            $(this).show();
                            timer.start(startedAt, closesAt);
                            timers.push(timer);

                        } else {

                            $(this).hide();
                        }

                    });

                } else {

                    //hide all timers to start
                    $timers.hide();

                }


            };

        //hide all timers to start
        $timers.hide();

        handbid.on('did-connect-to-auction', function (e) {

            var auction = e.get('auction');

            go(auction);
            auction.on('update', function (e) {
                alert('auction updated');
                go(e.get('auction'));
            });

        });


    });


})(typeof jQuery === 'undefined' ? false : jQuery);