var fs = require('fs'),
  Utils = require('../utils.js');

var IScroll = function (page) {
  'use strict';
  this.init(page);
};

IScroll.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "old-iScroll-check";
  self.res = {};
  self._page = page;
};

IScroll.prototype.onLoadFinished = function () {
	var self = this;
    self.res = self._page.evaluate(function(){
        if (window.iScroll && !window.IScroll){
            return true;
        }
        return false;
    });
};

IScroll.prototype.getResult = function () {
  var self = this;
  return self.res;
};

try {
  if (exports) {
    exports.Plugin = IScroll;
  }
} catch (ex) {
  IconLink = module.exports;
}

