"use strict";

let setup = require('../init'),
  should = require('should');

describe(process.env.ENGINE + '  page width plugin', () => {
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
    it('it should return correct value for page that fits screen', (done) => {
      client.open({
        url : 'data:text/html,<div style="width: 100%">' + (new Array(200)).join('This is a long string of text but it wraps nicely. ') + '</div>'
      }).then(() => {
        return client.getPluginResults();
      })
      .then((data) => {
	data.results['page-width-check'].should.eql('fits screen');
        done();
      })
      .catch(done);
    });
    it('it should return correct value for page that is wider than the screen', (done) => {
      client.open({
        url : 'data:text/html,<div style="width: 5000px">' + (new Array(200)).join('A long string of text overflows the screen due to the styling. ') + '</div>'
      }).then(() => {
        return client.getPluginResults();
      })
      .then((data) => {
	data.results['page-width-check'].should.eql('too wide');
        done();
      })
      .catch(done);
    });
  });
});
