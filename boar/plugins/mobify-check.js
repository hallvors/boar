var fs = require('fs');

var MobifyCheck = function (page) {
	'use strict';
	this.init(page);
};

MobifyCheck.prototype.init = function (page) {
	'use strict';
	var self = this;
	self.name = "mobify-check";
	self.res = false;
	self._page = page;
};

MobifyCheck.prototype.onLoadFinished = function () {
	var self = this;
	for (var i = 0; i < document.scripts.length; i+=1) {
		var s = document.scripts[i];
		if (s.src.indexOf('mobify') > -1) {
			self.res = s.src;
		}
	}
};

MobifyCheck.prototype.getResult = function () {
	var self = this;
	return self.res;
};

try {
	if (exports) {
		exports.Plugin = MobifyCheck;
	}
} catch (ex) {
	MobifyCheck = module.exports;
}

