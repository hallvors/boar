var fs = require('fs'),
  Utils = require('../utils.js');

var LinkRelCheck = function (page) {
  'use strict';
  this.init(page);
};

LinkRelCheck.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "link-rel-check";
  self.res = {};
  self._page = page;
};

LinkRelCheck.prototype.onLoadFinished = function () {
	var self = this;
	var linkrellist = document.querySelectorAll('link[rel*=\"icon\"]');
	var data = [];
	for (var i = 0, link; link = linkrellist[i]; i++) {
		data.push({});
		var relvalues = {};
		relvalues = link.rel.trim().split(/\\s+/);
		data[i].relvalue = relvalues;
		if (link.getAttribute('sizes')) {
			var sizevalues = {};
			sizevalues = link.getAttribute('sizes').trim().split(/\\s+/);
			data[i].sizes = sizevalues;
		}
	}
	self.res = JSON.stringify(data);
};

LinkRelCheck.prototype.getResult = function () {
  var self = this;
  return self.res;
};

try {
  if (exports) {
    exports.Plugin = LinkRelCheck;
  }
} catch (ex) {
  IconLink = module.exports;
}

