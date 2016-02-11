var messageString = 'window.orientation was read!'

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

WindowOrientationUsage.prototype.onInitialized = function () {
  var self = this;
  if (!self._started) {
    if (self._page.url) {
      self._page.evaluate(function(){
        var messageString = arguments[0];
        Object.defineProperty(window, 'orientation', {
          get: function () {
            console.log(messageString);
            return 1;
          }
        });
      }, [messageString]);
      self._started = true;
    }
  }
};

WindowOrientationUsage.prototype.onConsoleMessage = function (msg, lineNum, sourceId) {
  var self = this;
  if(msg === messageString) {
    self.res = true;
    return true;
  }
}

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

