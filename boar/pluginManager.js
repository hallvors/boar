var fs = require('fs'),
  Utils = require('./utils.js'),
  system = require('system'),
  webpage = require('webpage');

var _PluginManager = function (page) {
  'use strict';
  this.init(page);
};

_PluginManager.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.plugins = {};
  self._page = page;

  var pathToPlugins = "./plugins";
  var files = fs.list(pathToPlugins);
  for (var i in files) {
    if (files[i] && Utils.endsWith(files[i], "js")) {
      var plugin = require(pathToPlugins + "/" + files[i]);
      var p = new plugin.Plugin(self._page);
      self.plugins[p.name] = p;
    }
  }
};

_PluginManager.prototype.reset = function () {
  var self = this;
  this.init(self._page);
};

_PluginManager.prototype.onResourceRequested = function (requestData, networkRequest) {
  var pass = true;
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onResourceRequested) {
      try {
        if (!self.plugins[p].onResourceRequested(requestData, networkRequest)) {
          pass = false;
        }
      } catch (ex) {
        console.log(ex);
      }
    }
  }
  return pass;
};

_PluginManager.prototype.onResourceReceived = function (response) {
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onResourceReceived) {
      try {
        self.plugins[p].onResourceReceived(response);
      } catch (ex) {
        console.log(ex);
      }
    }
  }
};

_PluginManager.prototype.onInitialized = function () {
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onInitialized) {
      try {
        self.plugins[p].onInitialized();
      } catch (ex) {
        console.log(ex);
      }
    }
  }
};


_PluginManager.prototype.onLoadStarted = function () {
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onLoadStarted) {
      try {
        self.plugins[p].onLoadStarted();
      } catch (ex) {
        console.log(ex);
      }
    }
  }
};


_PluginManager.prototype.onLoadFinished = function () {
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onLoadFinished) {
      try {
        self.plugins[p].onLoadFinished();
      } catch (ex) {
        console.log(ex);
      }
    }
  }
};


_PluginManager.prototype.onConsoleMessage = function (msg, lineNum, sourceId) {
  var self = this;
  for (var p in self.plugins) {
    if (self.plugins[p].onConsoleMessage) {
      try {
        self.plugins[p].onConsoleMessage(msg, lineNum, sourceId);
      } catch (ex) {
        console.log(ex);
      }
    }
  }
};


_PluginManager.prototype.getResults = function () {
  var self = this;
  var results = {};
  for (var p in self.plugins) {
    try {
      if (self.plugins[p].getResult) {
        results[p] = self.plugins[p].getResult();
      }
    } catch (ex) {
      console.log("ERROR " + ex);
    }
  }
  return results;
};

try {
  exports.PluginManager = _PluginManager;
} catch (ex) {
  var PluginManager = _PluginManager;
  PluginManager = module.exports;
}