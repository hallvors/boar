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

logger.remove(logger.transports.Console);

if(global.DEBUG) { //jannah will use this value to supress logging to console
  logger.add(logger.transports.Console, {
    colorize : true,
    timestamp : true,
    level : 'debug'
  });
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
  this._killed = false;
  this._exited = false;

  let command = engine === 'webkit' ? PHANTOM_COMMAND : SLIMER_COMMAND;
  let args = [paths.tabPath, ip, port, hubPort];

  //currently slimerjs doesn't run in headless mode by itself
  //on linux there is xvfb that allows to run apps without visible windows
  if(os.platform() === 'linux' && engine === 'gecko') {
    args.unshift(SLIMER_COMMAND);
    args.unshift('--auto-servernum');
    command = 'xvfb-run';
  }

  self._tab = spawn(command, args, {
    //changing working directory ensures that adblock plugin can find
    //easylist.txt file, boar could be called from anywhere
    cwd      : paths.boarPath,
    detached : os.platform() === 'linux' //detached on linux will make tab its own process group
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

  self._tab.once('exit', function() {
    logger.info('Tab ' + port + ' exited');
    self._exited = true;
    self.emit('exit');
  });
};

Summoner.prototype._kill = function () {
  if(this._killed) {
    return logger.info('Tab is already killed');
  }

  clearTimeout(this._noSpawnTimer);

  if(!this._exited) {
    logger.info('killing tab on port ' + this.id);

    if(os.platform() === 'linux') {
      // -<pid of process> sends signal to all child processes of command,
      // required because xvfb spawns its own childs
      process.kill(-this._tab.pid, 'SIGKILL');
    } else {
      this._tab.kill('SIGKILL'); //kill it for good
    }
  }

  this._killed = true;
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

  let request = http.get(uri, function (response) {
      //slimerjs and phantomjs sometimes return 400 response status code if it is in half stoped state
      if(response.statusCode !== 200) {
        self._kill();
      } else {
        self._monitor();
      }
    })
    .once('error', function (error) {
      logger.warn('Monitor failed with an error ' + error);
      self._kill();
    });

  request.setTimeout(10000, function () {
    self._kill();
  });
};
