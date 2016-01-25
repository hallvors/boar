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
  paths = require('./paths'),
  psTree = require('ps-tree'),
  async = require('async'),
  usage = require('usage'),
  util = require('util'),
  rimraf = require('rimraf'),
  fs = require('fs');

logger.remove(logger.transports.Console);

if(global.DEBUG) { //jannah will use this value to supress logging to console
  logger.add(logger.transports.Console, {
    colorize : true,
    timestamp : true,
    level : 'debug'
  });
}

let Summoner = module.exports = function (engine, ip, port, hubPort, callback) {
  Summoner.super_.call(this);
  this.init(engine, ip, port, hubPort, callback);
};

util.inherits(Summoner, events.EventEmitter);

Summoner.prototype.init = function (engine, ip, port, hubPort, otherOptions, callback) {
  if(typeof otherOptions === 'function') {
    callback = otherOptions;
    otherOptions = {};
  }

  otherOptions.memoryLimit = otherOptions.memoryLimit || 1024 * 1024 * 1024; //1Gb

  this._otherOptions = otherOptions;

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
  let env = {};

  //currently slimerjs doesn't run in headless mode by itself
  //on linux there is xvfb that allows to run apps without visible windows
  if(engine === 'gecko') {
    //Individual profile folders are created so that it can properly cleanup
    //after process exits
    args.unshift(this._createSlimerProfile(port));
    args.unshift('--profile');


    if(process.env.XVFB_DISPLAY) {
      env.DISPLAY = process.env.XVFB_DISPLAY;
    } else if(os.platform() === 'linux') {
      args.unshift(SLIMER_COMMAND);
      args.unshift('--auto-servernum');
      command = 'xvfb-run';
    }
  }

  self._tab = spawn(command, args, {
    //changing working directory ensures that adblock plugin can find
    //easylist.txt file, boar could be called from anywhere
    cwd : paths.boarPath,
    env : env
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
    clearTimeout(self._memoryUsageTimeout);

    if(engine === 'gecko') {
      self._removeSlimerProfile(port);
    }
    self.emit('exit');
  });

  this._memoryUsageTimeout = null;

  this._monitorMemoryUsage();
};

Summoner.prototype._getSlimerProfileDir = function(port) {
  return path.resolve(os.tmpdir(), 'slimerjsprofile.'+port);
};

Summoner.prototype._createSlimerProfile = function(port) {
  let dir = this._getSlimerProfileDir(port);
  try {
    fs.mkdirSync(dir);
  } catch(e) {
    logger.error('Failed to create slimerjs profile dir', e);
  }

  return dir;
};

Summoner.prototype._removeSlimerProfile = function(port) {
  try {
    rimraf.sync(this._getSlimerProfileDir(port));
  } catch(e) {
    logger.error('Failed to remove slimerjs profile dir', e);
  }
};

Summoner.prototype._monitorMemoryUsage = function() {
  let self = this,
    usageOptions = {keepHistory : false};

  //none of the node modules used to collect memory usage stats support windows
  if(os.platform().indexOf('win') !== -1) {
    return;
  }

  if(this._exited || this._killed) { //it be that other async tasks managed to execute while it was killing tab
    return;
  }

  this._memoryUsageTimeout = setTimeout(() => {

    //gettings child processes is required because of xvfb for
    //slimerjs
    psTree(self._tab.pid, (error, childs) => {
      if(error) { //this probably means that process has exited?
        return logger.error('pstree to find all the childs pids failed with an error', error);
      }

      let pids = childs.map((child) => {
        return child.PID;
      });

      pids.push(self._tab.pid);

      async.map(pids, (pid, cb) => {
        usage.lookup(pid, usageOptions, (error, result) => {
          if(error) {
            logger.error('failed to get usage for child ' + pid, error);
            return cb(null, {memory : 0});
          }

          cb(null, result);
        });
      }, (_, results) => {
        let memUsage = results.reduce((sum, elem) => {
          return sum + elem.memory;
        }, 0);

        if(memUsage > self._otherOptions.memoryLimit) {
          return self._kill('Over memory limit! ' + memUsage + 'B');
        }

        self._monitorMemoryUsage();
      });
    });
  }, 1000);
};

Summoner.prototype._kill = function (reason) {
  if(this._killed) {
    return logger.info('Tab is already killed');
  }

  clearTimeout(this._noSpawnTimer);

  if(!this._exited) {
    logger.info('killing tab on port ' + this.id + ' because ' + reason);

    this._tab.kill('SIGKILL'); //kill it for good
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
  this._kill('Did not spawn');
};

Summoner.prototype._monitor = function () {
  let self = this;
  timers.clearTimeout(self._noSpawnTimer);

  // logger.info('Tab: ' + self.id + ' is alive.');
  let uri = 'http://' + self._ip + ':' + self.id + '/ping';
  logger.info('Tab ping url ' + uri);

  let request = http.get(uri, function (response) {
      //slimerjs and phantomjs sometimes return 400 response status code if it is in half stoped state
      if(response.statusCode !== 200) {
        self._kill('Got non 200 response for ping');
      } else {
        self._monitor();
      }
    })
    .once('error', function (error) {
      logger.warn('Monitor failed with an error ' + error);
      self._kill('Request failed with error');
    });

  request.setTimeout(10000, function () {
    self._kill('Ping timeout');
  });
};
