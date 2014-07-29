var Handbid = require('../handbid'),
    expect = require('chai').expect,
    request = require('request'),
    domain = 'http://127.0.0.1',
    domain = 'http://firebird.handbid.com',
    endpoint = domain + ':6789',
    legacyDomain = 'http://beta.handbid.com',
    hb,
    user = {
        firstName: 'Dummy',
        lastName:  'User',
        email:     'user@test.com',
        cellPhone: '720-253-5250'
    },
    email = 'liquidg3@mac.com',
    password = 'password',
    options = {
        url:                    endpoint,
        'force new connection': true
    },
    auctionKey = 'handbid-demo-auction',
    onError = function (done) {
        return function (e) {
            done(e.get('error'));
        };
    },
    itemKey     = 'boquet-of-flowers';



function clone(obj) {

    "use strict";

    if (null === obj || "object" !== typeof obj) {
        return obj;
    }
    var copy = obj.constructor(), attr;
    for (attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = obj[attr];
        }
    }
    return copy;
}


describe('sdk', function () {

    "use strict";

    this.timeout(100000);

    before(function (done) {

        request.get(legacyDomain + '/v1/rest/handbid/clean-test-user-data', function (error, response, body) {

            //done();
            request.get(legacyDomain + '/v1/rest/handbid/reset-auction-for-tests?query[auction]=' + auctionKey, function (error, response, body) {

                done();

            });

        });





    });

    afterEach(function (done) {

        if (hb) {
            setTimeout(function () {

                hb.disconnect(done);
                hb = null;

            }, 2000);
        } else {
            done();
        }

    });


    describe('#handbid', function () {

        it('should allow instantiation', function () {

            hb = new Handbid({
                url: endpoint
            });

            expect(hb).to.have.property('options').to.have.property('url').to.equal(endpoint);

        });

        it('should connect to server', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));
            hb.on('error', onError(done));

            hb.on('did-connect-to-server', function (e) {
                expect(e.data).to.have.property('handbid');
                done();
            });


        });

        it('should connect to auction', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));
            hb.connectToAuction(auctionKey);
            hb.on('error', onError(done));

            hb.on('did-connect-to-auction', function (e) {

                expect(e.data).to.have.property('auction');
                expect(e.get('auction').values).to.have.property('key');

                done();

            });

        });

        it('should connect to auction and get item prices', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));
            hb.connectToAuction(auctionKey);
            hb.on('error', onError(done));

            hb.on('did-connect-to-auction', function (e) {

                var auction = e.get('auction');

                auction.refreshItemPrices('*', function (prices) {

                    expect(Object.keys(prices).length).to.be.above(0);
                    done();

                });

            });

        });

        it('should let me signup a bidder, set authorization, then update that bidder yo', function (done) {

            hb = new Handbid();
            hb.connect(clone(options));
            hb.on('error', onError(done));

            hb.on('did-connect-to-server', function (e) {

                hb.signup(user, function (err, user) {

                    if (err) {

                        done(err);

                    } else {

                        expect(user).to.have.property('email').and.equal('user@test.com');

                        hb.setAuth(user.auth, function (err, user) {

                            if (err) {
                                done(err);
                                return;
                            }

                            expect(user).to.have.property('auth');
                            expect(hb.authenticated).to.equal(true);

                            hb.updateBidder(user, {
                                'email': 'newemail@test.com'
                            }, function (err, user) {

                                if (err) {
                                    done(err);
                                    return;
                                }

                                expect(user).to.have.property('email').and.equal('newemail@test.com');

                                done();

                            });


                        });

                    }

                });

            });

        });


        it('set auth on main connection also sets auth on auction.', function (done) {

            hb = new Handbid();
            hb.connect(clone(options));
            hb.connectToAuction(auctionKey);
            hb.on('error', onError(done));

            hb.on('did-connect-to-server', function (e) {

                hb.login(email, password, function (error, user) {

                    hb.setAuth(user.auth, function (err, user) {

                        var auction = hb.auctions[0];
                        expect(auction).to.have.property('authenticated').to.equal(true);
                        done();
                    });

                });

            });

        });

    });

});