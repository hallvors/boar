/* global require, window, phantom, slimer */

var webpage = require("webpage"),
  webserver = require('webserver'),
  system = require('system'),
  utils = require('./utils.js'),
  PluginManager = require('./pluginManager.js').PluginManager;



var Tab = function (ip, port, hubPort) {
  this._time = 0;
  this._resources = {};
  this._orphanResources = [];
  this._ads = [];
  this._autoDestructId = null;
  this._busy = false;
  this._consoleLog = [];
  this.init(ip, port, hubPort);
};


Tab.prototype.init = function (ip, port, hubPort) {
  var self = this;
  self._ip = ip;
  self._port = port;
  self._page = webpage.create();
  self._server = webserver.create();
  //self._adblock = new adblock();
  self._pluginManager = new PluginManager(self._page);
  self._hubPort = hubPort;
  console.log("Creating new Tab: " + ip + ":" + port);
  self._page.viewportSize = {
    width: 1024,
    height: 768
  };
  self._page.settings.resourceTimeout = 60000;
  self._page.onResourceRequested = function (requestData, networkRequest) {
    self._onResourceRequested(requestData, networkRequest);
  };
  self._page.onResourceReceived = function (response) {
    self._onResourceReceived(response);
  };
  self._page.onResourceTimeout = function (request) {
    self._onResourceTimeout(request);
  };
  self._page.onResourceError = function (resourceError) {
    self._onResourceError(resourceError);
  };
  self._page.onConsoleMessage = function (msg, lineNum, sourceId) {
    self._onConsoleMessage(msg, lineNum, sourceId);
  };
  self._page.onError = function (msg, stack) {
    self._onError(msg, stack);
  };
  self._page.onInitialized = function () {
    self._onInitialized();
  };
  self._page.onLoadStarted = function () {
    self._onLoadStarted();
  };
  self._page.onLoadFinished = function (status) {
    self._onLoadFinished(status);
  };
  console.log("------");
  console.log(self._ip + ":" + self._hubPort + '/announceTab');
  try {
    self._server.listen(ip + ":" + port,
      function (request, response) {
        self._handleRequest(request, response);
      });
    if (self._hubPort) {
      self._announceTab();
    }
  } catch (ex) {
    phantom.exit();
  }
  console.log("Starting Tab on port: " + self._port);
  self._resetAutoDestruct();
};

Tab.prototype._onError = function (msg, stack) {
  msg = "\nScript Error: " + msg + "\n";
  if (stack && stack.length) {
    msg += "       Stack:\n";
    stack.forEach(function (t) {
      msg += '         -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : '') + "\n";
    });
  }
  console.error(msg + "\n");
};

Tab.prototype._announceTab = function () {
  var self = this;
  var page = webpage.create();
  //window.close();
  var url = "http://" + self._ip + ":" + self._hubPort + '/announceTab',
    data = JSON.stringify({
      port: self._port
    }),
    headers = {
      "Content-Type": "application/json"
    };

  page.open(url, 'post', data, headers, function (status) {
    page.close();
    if (status !== "success") {
      phantom.exit();
    }
  });
};


Tab.prototype._onResourceRequested = function (requestData, networkRequest) {
  var self = this;
  //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
  if (!self._pluginManager.onResourceRequested(requestData, networkRequest)) {
    networkRequest.abort();
  } else {
    self._resources[requestData.id] = {
      request: requestData,
      response: null,
      blocking: Date.now() - self._time,
      waiting: -1,
      receiving: -1
    };
    self._orphanResources.push(requestData.id);
  }
};


Tab.prototype._onResourceReceived = function (response) {
  var self = this;
  self._pluginManager.onResourceReceived(response);
  switch (response.stage) {
    case 'start':
      self._resources[response.id].waiting = response.time.getTime() - self._resources[response.id].request.time.getTime();
      break;
    case 'end':
      if (self._resources[response.id].response) {
        self._resources[response.id].receiving = response.time.getTime() - self._resources[response.id].response.time.getTime();
      }
      break;
    default:
      break;
  }
  self._orphanResources.splice(self._orphanResources.indexOf(response.id), 1);
  self._resources[response.id].response = response;
  //console.log('Response (#' + response.id + ', stage "' + response.stage + '"): ' + JSON.stringify(self._resources[response.id]));
};


Tab.prototype._onResourceError = function (request) {
  var self = this;
  self._orphanResources.splice(self._orphanResources.indexOf(request.id), 1);
  //self._resources[request.id].request = request;
  //console.log('Request (#' + request.id + ', timed out: "' + JSON.stringify(self._resources[request.id]));
};


Tab.prototype._onResourceTimeout = function (resourceError) {
  var self = this;
  self._orphanResources.splice(self._orphanResources.indexOf(resourceError.id), 1);
  self._resources[resourceError.id].response = resourceError;
  //console.log('Request (#' + resourceError.id + ' had error: "' + JSON.stringify(self._resources[resourceError.id]));
};


Tab.prototype._onConsoleMessage = function (msg, lineNum, sourceId) {
  var self = this;
  self._pluginManager.onConsoleMessage(msg, lineNum, sourceId);
  self._consoleLog.push({
    msg: msg,
    lineNum: lineNum,
    sourceId: sourceId
  });
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};


Tab.prototype._onInitialized = function () {
  var self = this;
  self._pluginManager.onInitialized();
};


Tab.prototype._onLoadStarted = function () {
  var self = this;
  self._pluginManager.onLoadStarted();
};


Tab.prototype._onLoadFinished = function () {
  var self = this;
  self._pluginManager.onLoadFinished();
};


Tab.prototype._open = function (url, waitForResources, callback) {
  var self = this;
  self._pluginManager.reset();
  self._resources = {};
  self._orphanResources = [];
  self._time = Date.now();

  if (waitForResources === undefined)
    waitForResources = true;

  self._page.open(url, function (status) {

    var callbackFunc = function () {
      callback({
        success: status === 'success' ? true : false,
        elapsedTime: Date.now() - self._time
      });
    };

    if (waitForResources)
      self._waitForResources(60000, function () {
        callbackFunc();
      });
    else
      callbackFunc();
  });
};


Tab.prototype._addCookie = function (name, value, domain, path, httponly, secure, expires, callback) {
  var success = phantom.addCookie({
    'name': name,
    'value': value,
    'domain': domain,
    'path': path,
    'httponly': httponly ? httponly : false,
    'secure': secure ? secure : false,
    'expires': expires ? expires : (new Date()).getTime() + 3600
  });
  callback({
    success: success
  });
};


Tab.prototype._setUserAgent = function (userAgent, callback) {
  var self = this;
  self._page.settings.userAgent = userAgent;
  callback({
    success: true
  });
};


Tab.prototype._getResources = function (callback) {
  var self = this;
  callback({
    success: true,
    resources: self._resources
  });
};


Tab.prototype._getScreenshot = function (callback) {
  var self = this;
  self._busy = true;
  utils.fixFlash();
  window.setTimeout(function () {
    self._waitForResources(60000, function () {
      var base64 = self._page.renderBase64('PNG');
      self._busy = false;
      callback({
        success: true,
        data: base64
      });
    });
  }, 5000);
};


Tab.prototype._waitForResources = function (timeout, callback) {
  var self = this;
  if (timeout === null || timeout === undefined) {
    timeout = 20000;
  }
  var time = Date.now();

  var wait = function () {
    if (self._orphanResources.length > 0 && Date.now() - time < timeout) {
      //console.log("Orphaned resources: " + self._orphanResources.length + " " + self._orphanResources);
      setTimeout(wait, 1000);
    } else {
      callback();
    }
  };
  setTimeout(wait, 1000);
};


Tab.prototype._destroy = function (callback) {
  var self = this;
  callback({
    success: true
  });
  setTimeout(function() {
    self._page.close();
    self._server.close();
    phantom.exit();
  }, 10);
};


Tab.prototype._ping = function (callback) {
  window.setTimeout(function () {
    callback(null);
  }, 5000);
};


Tab.prototype._evaluate = function (script, callback) {
  var self = this;
  var result = null;
  if (typeof slimer !== 'undefined')
    result = self._page.evaluateJavaScript("(" + script + ")()");
  else
    result = self._page.evaluateJavaScript(script);

  callback({
    script: script,
    result: result
  });
};


Tab.prototype._evaluateOnGecko = function (script, callback) {
  /*jslint evil: true */
  'use strict';
  var result = eval(script);
  callback({
    script: script,
    result: result
  });
};


Tab.prototype._getConsoleLog = function (callback) {
  var self = this;
  callback({
    consoleLog: self._consoleLog
  });
};


Tab.prototype._clearConsoleLog = function (callback) {
  this._consoleLog.length = 0;
}

Tab.prototype._getCookies = function (callback) {
  callback({
    cookies: phantom.cookies
  });
};


Tab.prototype._setScreenSize = function (size, callback) {
  var self = this;
  self._page.viewportSize = {
    width: size.width,
    height: size.height
  };
  callback({
    size: self._page.viewportSize
  });
};


Tab.prototype._getPluginResults = function (callback) {
  var self = this;
  callback({
    results: self._pluginManager.getResults()
  });
};


Tab.prototype._resetAutoDestruct = function () {
  var self = this;
  //console.log("Resetting auto Destruct");
  var destroyFunc = function () {
    if (!self._busy) {
      phantom.exit();
    } else
      self._resetAutoDestruct();
  };
  window.clearTimeout(self._autoDestructId);
  self._autoDestructId = window.setTimeout(destroyFunc, 120000);
};


Tab.prototype._handleRequest = function (request, response) {
  var self = this;
  if (!request.post)
    request.post = "";
  var callback = function (data) {
    response.statusCode = 200;
    data = data !== null ? JSON.stringify(data) : "";
    response.write(data);
    response.close();

  };
  var data = request.post !== "" ? JSON.parse(request.post) : {};
  self._page.evaluate(function () {
    window.focus();
  });
  switch (request.url) {
    case "/open":
      self._resetAutoDestruct();
      self._clearConsoleLog();
      self._open(data.url, data.waitForResources, callback);
      break;
    case "/addCookie":
      self._resetAutoDestruct();
      self._addCookie(data.name, data.value, data.domain, data.path,
        data.httponly, data.secure, data.expires, callback);
      break;
    case "/setUserAgent":
      self._resetAutoDestruct();
      self._setUserAgent(data.userAgent, callback);
      break;
    case "/getResources":
      self._resetAutoDestruct();
      self._getResources(callback);
      break;
    case "/getScreenshot":
      self._resetAutoDestruct();
      self._getScreenshot(callback);
      break;
    case "/destroy":
      self._destroy(callback);
      break;
    case "/ping":
      self._ping(callback);
      break;
    case "/evaluate":
      self._resetAutoDestruct();
      self._evaluate(data.script, callback);
      break;
    case "/evaluateOnGecko":
      self._resetAutoDestruct();
      self._evaluateOnGecko(data.script, callback);
      break;
    case "/getConsoleLog":
      self._resetAutoDestruct();
      self._getConsoleLog(callback);
      break;
    case "/getCookies":
      self._resetAutoDestruct();
      self._getCookies(callback);
      break;
    case "/waitForResources":
      self._resetAutoDestruct();
      self._waitForResources(data.timeout, callback);
      break;
    case "/setScreenSize":
      self._resetAutoDestruct();
      self._setScreenSize(data.size, callback);
      break;
    case "/getPluginResults":
      self._resetAutoDestruct();
      self._getPluginResults(callback);
      break;
    default:
      console.log("WHAT DO YOU WANT?");
      response.statusCode = 500;
      response.write("");
      response.close();
      return;
  }
};


if (system.args[1] !== undefined && system.args[2] !== undefined) {
  console.log(system.args[2]);
  var ip = system.args[1];
  var port = system.args[2];
  new Tab(ip, port, system.args[3]);
}
