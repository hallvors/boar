"use strict";

let setup = require('../init'),
  should = require('should');

describe(process.env.ENGINE + ' CSS analysis', () => {
  let client;

  beforeEach((done) => {
    setup.start(process.env.ENGINE, (error, c) => {
      client = c;
      done(error);
    });
  });

  afterEach((done) => {
    client.destroy().then(() => {
      setup.stop(done);
    }).catch(done);
  });

  describe('getPluginResult', () => {
    it('it should return some results for css analysis', (done) => {
      client.open({
        url : 'data:text/html,<div style="-webkit-transform:skew(-10deg); display:-webkit-flex">test page</div>'
      }).then(() => {
        return client.getPluginResults();
      })
      .then((data) => {
        //right now css-analyzer tests for webkit specific things only
        if(process.env.ENGINE==='webkit') {
          data.results['css-analyzer'].length.should.be.above(0);
        } else {
          should.exist(data.results['css-analyzer']);
        }
        done();
      })
      .catch(done);
    });
    it('it should return nothing if there are no relevant styles', (done) => {
      client.open({
        url : 'data:text/html,<div>test page</div>'
      }).then(() => {
        return client.getPluginResults();
      })
      .then((data) => {console.log(JSON.stringify(data.results['css-analyzer'], null, 4));
        //right now css-analyzer tests for webkit specific things only
        if(process.env.ENGINE==='webkit') {
          data.results['css-analyzer'].length.should.eql(0);
        } else {
          should.exist(data.results['css-analyzer']);
        }
        done();
      })
      .catch(done);
    });
  });
});
