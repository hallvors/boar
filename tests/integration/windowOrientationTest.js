"use strict";

let setup = require('../init'),
  should = require('should');

describe(process.env.ENGINE + ' Window orientation', () => {
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

  it('should be returing false for window orientation usage if it wasnt accessed', (done) => {
    client.open({
      url : 'data:text/html,<html><script>void(\'foo\');</script><p>Hello test</p></html>'
    }).then(() => {
      return client.getPluginResults();
    })
    .then((data) => {
      data.results['window-orientation-usage'].should.be.equal(false);
      done();
    })
    .catch(done);
  });

  it('should be returing true for window orientation usage if it was accessed', (done) => {
    client.open({
      url : 'data:text/html,<html><script>void(window.orientation);</script><p>Hello test</p></html>'
    }).then(() => {
      return client.getPluginResults();
    })
    .then((data) => {
      data.results['window-orientation-usage'].should.be.equal(true);
      done();
    })
    .catch(done);
  });
});
