var Handbid     = require('../handbid-js'),
    expect      = require('chai').expect,
    request     = require('request'),
    domain      = 'http://orion.local',
    endpoint    = domain + ':6789',

    hb,
    user        = {
        firstName:  'Dummy',
        lastName:   'User',
        email:      'user@test.com',
        cellPhone:  '720-253-5250'
    },
    options     = {
        url: endpoint,
        'force new connection': true
    },
    auctionKey  = 'handbid-demo-auction';

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}


describe('sdk', function () {

    this.timeout(100000);

    before(function (done) {
        request.get( domain+'/v1/rest/handbid/clean-test-user-data', function( error, response, body ){
            done();
        });

    });

    afterEach(function (done) {

        if(hb) {
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

            expect(hb).to.have.property('_url', endpoint);

        });

        it('should connect to server', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));

            hb.on('did-connect-to-server', function (e) {
                expect(e.data).to.have.property('handbid');
                done()
            });

            hb.on('error', function (error) {
                done(error);
            });


        });

        it('should connect to auction', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));
            hb.connectToAuction(auctionKey);

            hb.on('did-connect-to-auction', function (e) {

                expect(e.data).to.have.property('auction');
                expect(e.get('auction')).to.have.property('key');
                expect(hb.auction()).to.have.property('key');

                done();

            });

            hb.on('error', function (err) {
                done(err);
            });


        });

        it('should connect to auction and get item prices', function (done) {

            hb = new Handbid();

            hb.connect(clone(options));
            hb.connectToAuction(auctionKey);

            hb.on('did-connect-to-auction', function (e) {

                hb.refreshItemPrices('*', function (prices) {

                    expect(Object.keys(prices).length).to.be.above(0);
                    done();

                });

            });

            hb.on('error', function (err) {
                done(err);
            });


        });

        it.only('should let me signup a bidder, set authorization, then update that bidder yo', function (done) {

            hb = new Handbid();
            hb.connect(clone(options));
            hb.on('did-connect-to-server', function (e) {

                hb.signup(user, function (err, user) {

                    if(err) {
                        done(err);

                    }else{
                        expect(user).to.have.property('email').and.equal('user@test.com');

                        hb.setAuth( user.auth, function (err, user) {
                            if( err ){
                                done( err );
                            }

                        });

                    }



                });

            });

        });

    });

});