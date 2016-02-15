# Boar plugins

Boar supports plugins written in JavaScript. All *.js files in the [plugins folder](https://github.com/Asynchq/boar/tree/master/boar/plugins) will be processed by the [plugin manager](https://github.com/Asynchq/boar/blob/master/boar/pluginManager.js) when Boar starts, and their various event listeners will be triggered while web pages are loading.

## Possibilities and limitations

Boar plugins are typically used to collect specific information about the sites and web pages Boar will browse. They can enumerate resources, check what URLs are loading (including all external content like stylesheets, scripts and images), and inject JavaScript into the DOM of the page itself and check the return value.

However, Boar itself will timeout if a plugin takes too long to run. Specifically, the [Summoner.prototype._monitor()](https://github.com/Asynchq/boar/blob/master/lib/summoner.js#L253) code expects a response within a given timeout, and plugins run on the same thread as the code that will respond to the monitoring. 

## API
### Attributes

These attributes on the plugin object have special significance:

#### ```name```
The name property is used to identify the plugin's result data when data from all plugins are combined and returned.

#### ```_page```
Plugin code can use the ```this._page``` property to refer to the web page currently loaded by the Boar instance, for example to call ```this._page.evaluate(function(){ /* code to run in page */});```

#### ```res```
It's a common convention to add plugin results to ```this.res```, although the property can be named something else.

### Methods

Each plugin must define the following methods:

####```init()```
This method is called when Boar prepares plugin instances for a given page.

#### ```getResults()```
This method is typically called at the end and must return the data this plugin has compiled about the current page.

### Event handlers

Plugins will typically define one or more event handlers. These events are generally derived from SlimerJS and PhantomJS events, as described for example [in the SlimerJS documentation](http://docs.slimerjs.org/current/api/webpage.html).

#### ```onInitialized```

Called when the loading of the page is initialized. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-oninitialized)

#### ```onLoadStarted```

Called when the loading of the page or a sub-frame starts. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-onloadstarted)

#### ```onConsoleMessage```

Called when a page uses for example ```console.log()```. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-onconsolemessage)


#### ```onResourceRequested```

Called when for example an external script or stylesheet is requested. Code handling this event can also stop the request. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-onresourcerequested)

#### ```onResourceReceived```

Called when an external resource loads. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-onresourcereceived)

#### ```onLoadFinished```

Called when the loading of the page or a sub-frame ends. [More](http://docs.slimerjs.org/current/api/webpage.html#webpage-onloadfinished)

### Boilerplate code

Change "MyPlugInName" to the name of your plugin and add code inside the event handlers you need:

```
var fs = require('fs'),
  Utils = require('../utils.js');

var MyPlugInName = function (page) {
  'use strict';
  this.init(page);
};

MyPlugInName.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "my-plugin-name";
  self.res = {};
  self._page = page;
};

// Handle the events your plugin requires, delete the others
// Use this._page.evaluate(function(){}) inside event handlers
// to run JavaScript inside the page itself

MyPlugInName.prototype.onInitialized = function () {
};

MyPlugInName.prototype.onLoadStarted = function () {
};

MyPlugInName.prototype.onConsoleMessage = function (message) {
};

MyPlugInName.prototype.onResourceRequested = function (requestData, networkRequest) {
};

MyPlugInName.prototype.onResourceReceived = function (responseData) {
};

MyPlugInName.prototype.onLoadFinished = function () {
};

MyPlugInName.prototype.getResult = function () {
  return this.res;
};

try {
  if (exports) {
    exports.Plugin = MyPlugInName;
  }
} catch (ex) {
  MyPlugInName = module.exports;
}

```
