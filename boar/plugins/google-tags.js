var GoogleTags = function (page) {
  'use strict';
  this.init(page);
};

GoogleTags.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "google-tag-manager";
  self.res = {};
  self._page = page;
};

GoogleTags.prototype.onLoadFinished = function (status) {
  var self = this;
  var data = self._page.evaluate(function () {
    var data = JSON.stringify(window.dataLayer);
    return JSON.parse(data);
  });
  self.res[self._page.url] = data;
};

GoogleTags.prototype.getResult = function () {
  var self = this;
  return self.res;
};

try {
  if (exports) {
    exports.Plugin = GoogleTags;
  }
} catch (ex) {
  GoogleTags = module.exports;
}
