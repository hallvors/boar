"use strict";

if(process.env.DEBUG) {
  global.DEBUG = true;
}

let http = require('http'),
  Summoner = require('../lib/summoner'),
  freePort = require('find-free-port'),
  BoarClient = require('boar-client'),
  tab, server;

if(process.env.ENGINE === undefined) {
  throw new Error('ENGINE env variable must be set');
}

module.exports.start = function(engine, callback) {
  let released = false;

  server = http.createServer((req, resp) => {
    resp.end('{}');
    if(!released) {
      released = true;
      tab.release();
    }
  }).listen(0);

  freePort(50000, (error, port) => {
    if(error) {
      return callback(error);
    }

    tab = new Summoner(engine, '127.0.0.1', port, server.address().port, (err, url) => {
      if(err) {
        return callback(err);
      }

      let boarClient = new BoarClient(url.url);
      callback(null, boarClient);
    });
  });
};

module.exports.stop = function(callback) {
  tab.once('exit', callback);
  server.close();
  tab._kill('Closing');
};
