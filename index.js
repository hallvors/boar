"use strict";

let paths = require('./lib/paths');

module.exports = {
	tabPath  : paths.tabPath,
	boarPath : paths.boarPath,
	Summoner : require('./lib/summoner')
};