var fs = require('fs'),
  Utils = require('../utils.js');

var pageWidthCheck = function (page) {
  'use strict';
  this.init(page);
};

pageWidthCheck.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "page-width-check";
  self.res = {};
  self._page = page;
};

pageWidthCheck.prototype.onLoadFinished = function () {
  var self = this;
  self.res = self._page.evaluate(function(){
    var docwidth = 0;
    if(document.body) { // For unknown reasons, doc.body is not always there/ready when this runs
      docwidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    } else {
      docwidth = document.documentElement.scrollWidth;
    }
    if(docwidth > (window.innerWidth * 1.01)) {
      return 'too wide'; // page is more than 1 percentage points wider than than window width
    }
    return 'fits screen';
  });
};

pageWidthCheck.prototype.getResult = function () {
  var self = this;
  return self.res;
};

try {
  if (exports) {
    exports.Plugin = pageWidthCheck;
  }
} catch (ex) {
  pageWidthCheck = module.exports;
}

