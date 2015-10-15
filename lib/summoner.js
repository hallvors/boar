"use strict";

const PHANTOM_COMMAND = require('phantomjs').path,
  SLIMER_COMMAND = require('slimerjs').path;

let events = require('events'),
  suggar = require('sugar'),
  http = require('http'),
  spawn = require('child_process').spawn,
  timers = require('timers'),
  path = require('path'),
  os = require('os'),
  logger = require('winston'),
  paths = require('./paths');

if(!global.DEBUG) { //jannah will use this value to supress logging to console
  logger.remove(logger.transports.Console);
}

let Summoner = module.exports = function (engine, ip, port, hubPort, callback) {
  this.init(engine, ip, port, hubPort, callback);
};

Summoner.prototype = new events.EventEmitter();

Summoner.prototype.init = function (engine, ip, port, hubPort, callback) {
  logger.info('Initiating tab @ ' + ip + ':'  + port);
  let self = this;
  self._summonVerified = false;
  self.id = port;
  self._ip = ip;
  self._port = port;
  self._callback = callback;
  self._tab = null;
  self._date = Date.create('today');
  logger.info('Summoning Tab', {
    ip      : ip,
    port    : port,
    hubPort : hubPort
  });
  let command = engine === 'webkit' ? PHANTOM_COMMAND : SLIMER_COMMAND;

  self._tab = spawn(command, [paths.tabPath, ip, port, hubPort], {
    //changing working directory ensures that adblock plugin can find
    //easylist.txt file, jannah can be called from anywhere
    cwd : paths.boarPath
  });

  self._noSpawnTimer = timers.setTimeout(function () {
    self._onNoSpawn();
  }, 10000);
  self._tab.stdout.on('data', function (data) {
    logger.info('stdout: ' + data);
  });
  self._tab.stderr.on('data', function (data) {
    logger.info('stderr: ' + data);
  });
};

Summoner.prototype._kill = function () {
  logger.info('killing tab on port ' + this.id);
  this._tab.kill();
  this.emit('exit');
};

Summoner.prototype.release = function () {
  this._callback(null, {
    url : 'http://' + this._ip + ':' + this.id
  });
  this._monitor();
};

Summoner.prototype._onNoSpawn = function () {
  logger.warn('Tab did not spawn', {
    port : this._port
  });

  this._callback(new Error('Failed to spawn a tab'));
  this._kill();
};

Summoner.prototype._monitor = function () {
  let self = this;
  timers.clearTimeout(self._noSpawnTimer);

  logger.info('Tab: ' + self.id + ' is alive.');
  let uri = 'http://' + self._ip + ':' + self.id + '/ping';
  logger.info('Tab ping url ' + uri);

  let request = http.get(uri, function () {
      self._monitor();
    })
    .on('error', function () {
      self._kill();
    });

  request.setTimeout(10000, function () {
    self._kill();
  });
};
