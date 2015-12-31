"use strict";

let setup = require('../init'),
  should = require('should');

describe(process.env.ENGINE + ' Logging', () => {
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

  describe('getErrorLog', () => {
    it('should not return anything if nothing is logged', (done) => {
      client.open({
        url : 'data:text/html,<html><script>void(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getErrorLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(0);
        done();
      })
      .catch(done);
    });

    it('should be returning some output if there is runtime error', (done) => {
      client.open({
        url : 'data:text/html,<html><script>undefined(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getErrorLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        done();
      })
      .catch(done);
    });

    it('should be returning some output if there is compile error', (done) => {
      client.open({
        url : 'data:text/html,<html><script>void(\'foo)</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getErrorLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        done();
      })
      .catch(done);
    });

    it('should not return anything if console.* method is used', (done) => {
      client.open({
        url : 'data:text/html,<html><script>console.log(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getErrorLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(0);
        done();
      })
      .catch(done);
    });
  });

  describe('getConsoleLog', () => {
    it('should not return anything if nothing happens', (done) => {
      client.open({
        url : 'data:text/html,<html><script>void(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(0);
        done();
      })
      .catch(done);
    });

    it('should not return any compile time errors when requesting console output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>void(\'foo)</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(0);
        done();
      })
      .catch(done);
    });

    it('should not return any runtime errors when requesting console output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>undefined(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(0);
        done();
      })
      .catch(done);
    });

    //right now webkit and gecko output is different
    //gecko has msg, lineNum, sourceId, webkit only msg
    it('should return console.log output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>console.log(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        data.consoleLog[0].msg.should.be.equal('foo');
        data.consoleLog[0].lineNum.should.be.equal(1);
        done();
      })
      .catch(done);
    });

    it('should return console.info output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>console.info(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        data.consoleLog[0].msg.should.be.equal('foo');
        data.consoleLog[0].lineNum.should.be.equal(1);
        done();
      })
      .catch(done);
    });

    it('should return console.warn output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>console.warn(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        data.consoleLog[0].msg.should.be.equal('foo');
        data.consoleLog[0].lineNum.should.be.equal(1);
        done();
      })
      .catch(done);
    });

    it('should return console.error output', (done) => {
      client.open({
        url : 'data:text/html,<html><script>console.error(\'foo\')</script><p>Hello test</p></html>'
      }).then(() => {
        return client.getConsoleLog();
      })
      .then((data) => {
        data.consoleLog.length.should.be.equal(1);
        data.consoleLog[0].msg.should.be.equal('foo');
        data.consoleLog[0].lineNum.should.be.equal(1);
        done();
      })
      .catch(done);
    });
  });
});
