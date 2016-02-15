/**
We should gather info on <VIDEO> element usage, including:

 * does given page have HTML5 video elements?
 * if yes, what are their classes / IDs (interesting for identifying video libs)
 * list of video formats given for element
 * element.currentSrc (an indication of whether a valid source was found)
 * readyState (ditto)
 * video embedding script name if recognisable
   * It would be nice to detect video.js, jplayer, popcorn.js,
   * YouTube API scripts (old player, new iframe), brightcove
*/

var fs = require('fs'),
  Utils = require('../utils.js');

var VideoStats = function (page) {
  'use strict';
  this.init(page);
};

VideoStats.prototype.init = function (page) {
  'use strict';
  var self = this;
  self.name = "video-stats";
  self.res = {hasVideo:false, types:[], classNames:[], httpTypes: [],
    readyStates:[], IDs:[], libraries:[], currentSrc:''};
  self._page = page;
};

// Trying to guess/detect common video libraries
VideoStats.prototype._libraryHeuristics = function(){
  var results = [];
  var tests = {
    'video.js': function(){return typeof window.videojs !== 'undefined';},
    'jPlayer': function(){
      return (window.jQuery && typeof window.jQuery.jPlayer !== 'undefined') ||
          window.$ && typeof $(document).jPlayer !== 'undefined';
    },
    'Popcorn': function(){return typeof window.Popcorn !== 'undefined';},
    'Kaltura': function(){return typeof window.kalturaIframeEmbed !== 'undefined';},
    'YouTube': function(){return typeof window.onYouTubePlayerReady !== 'undefined';},
    'YouTubeOld': function(){return typeof window.ytplayer !== 'undefined';},
    'YouTubeNew': function(){return window.YT && typeof window.YT.Player !== 'undefined';}
  };
  for(var test in tests) {
    if(this._page.evaluate(tests[test])) {
      results.push(test);
    }
  }
  return results;
};

VideoStats.prototype.onResourceReceived = function (responseData) {
  var type = responseData.contentType.toLowerCase();
  // Detect loading requests of type video/*
  // and Apple's vnd.mpeg-url stuff.
  if(type.indexOf('video/') > -1 || type.indexOf('mpeg') > -1) {
    this.res.httpTypes.push(responseData.contentType);
  }
};

VideoStats.prototype.onLoadFinished = function () {
  // First check for <video>
  var thisPageHasVideo = this._page.evaluate(function(){
    return document.getElementsByTagName('video').length > 0;
  });

  // Note: this event might fire several times - for this page and sub-frames
  // hasVideo should track the "combined" state - be true if
  // *any* subframe contains <video> elements
  this.res.hasVideo = this.res.hasVideo || thisPageHasVideo;

  // We have no more work to do here if there's no VIDEO on *this* page
  if(!thisPageHasVideo) {
    return;
  }

  // Check various attributes
  var attrs = this._page.evaluate(function(){
    var listCln = [];
    var listIDs = [];
    var currentSrc = [];
    var rStates = [];
    [].forEach.call(document.querySelectorAll('video'), function(elm){
      listCln.concat(elm.className.split(' '));
      listIDs.push(elm.id);
      currentSrc.push(elm.currentSrc);
      rStates.push(elm.readyState);
    });
    return {'cls':listCln, 'ids':listIDs, 'cs':currentSrc, 'rs':rStates};
  });

  // Add to results
  this.res.IDs = this.res.IDs.concat(attrs.ids);
  this.res.classNames = this.res.classNames.concat(attrs.cls);
  this.res.currentSrc = this.res.currentSrc.concat(attrs.cs);
  this.res.readyStates = this.res.readyStates.concat(attrs.rs);

  // List all MIME types mentioned
  this.res.types = this.res.types.concat(
    this._page.evaluate(function(){
      var list = [];
      [].forEach.call(document.querySelectorAll('video,source'), function(elm){
        if(elm.type){
          list.push(elm.type);
        }
      });
      return list;
    })
  );

  // library heuristics!
  this.res.libraries = this.res.libraries.concat(this._libraryHeuristics());

};

VideoStats.prototype.getResult = function () {
  return this.res;
};

try {
  if (exports) {
    exports.Plugin = VideoStats;
  }
} catch (ex) {
  VideoStats = module.exports;
}
