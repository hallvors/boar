var fs = require('fs');

var WindowOrientationUsage = function (page) {
  'use strict';
  this.init(page);
};

WindowOrientationUsage.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "window-orientation-usage";
  self.res = false;
  self._started = false;
  self._page = page;
};

WindowOrientationUsage.prototype.onLoadInitialized = function () {
  var self = this;
  if (!self._started) {
    Object.defineProperty(window, 'orientation', {
      get: function () {
        self.res = true;
      }
    });
  }
};

WindowOrientationUsage.prototype.getResult = function () {
  var self = this;
  return self.res;
};

try {
  if (exports) {
    exports.Plugin = WindowOrientationUsage;
  }
} catch (ex) {
  WindowOrientationUsage = module.exports;
}

