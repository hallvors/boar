[![Build Status](https://travis-ci.org/Asynchq/boar.svg?branch=master)](https://travis-ci.org/Asynchq/boar)

# Boar
Browser over a Restful(API)

## Local testing and development

### Install

1. Clone this project (or your own fork of it, if you want to create pull requests)
2. ```npm install```
3. For linux install ```xvfb```, this way gecko based slimerjs will run in true headless mode
(in current state it there is no out of the box solution for that)

!NB user who runs boar must have home directory, slimerjs will try to write files there
!NB Running Boar requires *Node.js 0.12* or greater, with support for ES6 syntax

### Local use

SlimerJS can use an environment variable to determine the exact Firefox binary to use. You may want to set SLIMERJS_LAUNCHER and point to a specific Firefox.exe or xulrunner instance. If SlimerJS fails to find Firefox automatically on your system, you *must* set this variable before you'll be able to run the next commands.

Run ```bin/boar gecko|webkit```, default port is 8778

### Troubleshooting SlimerJS issues

* If you get an error saying "Platform version x.xx is not compatible with .." you must either set SLIMERJS_LAUNCHER to point to a Firefox binary of the expected version, or edit the MaxVersion setting in submodules/slimerjs/src/application.ini

* If you get an error saying "Permission denied to access property 'CoffeeScript'", the easiest workaround is to change ```enableCoffeeScript: true``` to ```enableCoffeeScript: false``` in submodules/slimerjs/src/modules/slConfiguration.jsm

## Quick API Reference

* $HUB_URL / new:
  - input:
      - (optional) country: Two letter representation of the country, such as DE, US, UK or NL
      - (optional) city: lower-cased city name
  - returns:
      - url: a url ($URL) of a provisioned tab for the requested location, all other calls will be done against this url.


* $URL / open:
  - input:
      - url: a url to open
  - returns:
      - success: boolean (true/false) if opening the url was successful
      - elapsedTime: Time it took to complete the operation


* $URL / addCookie:
  - input:
      - name: the name of the cookie (string)
      - value: the value of the cookie (string)
      - domain: the domain name on which the cookie is attached
      - path: the path in URLs on which the cookie is valid
      - httponly: true if the cookie should only be sent to, and can only be modified by, an HTTP connection.
      - secure: true if the cookie should only be sent over a secure connection.
      - expires: Holds the expiration date, in milliseconds since the epoch. This property should be null for cookies existing only during a session.
  - returns:
      - success: boolean (true/false) if adding the cookie was successful


* $URL / setUserAgent:
  - input:
      - userAgent: the value of the userAgent (string)
  - returns:
      - success: boolean (true/false) if setting the user-agent was successful


* $URL / getResources:
  - returns:
      - resources: a dict with all resources loaded
      - success: boolean (true/false) if fetching the resources was successful


* $URL / getScreenshot:
  - returns:
      - data: a base64 string representation of the rendered page
      - success: boolean (true/false) if taking a screenshot was successful


* $URL / evaluate:
  - input:
      - script: a javascript function to be executed on the DOM with optional primitive return value
  - returns:
      - script: the executed javascript function (string)
      - result: result of the executed javascript function


* $URL / evaluateOnGecko:
  - input:
      - script: a javascript function to be executed on the Gecko engine with optional primitive return value
  - returns:
      - script: the executed javascript function (string)
      - result: result of the executed javascript function


* $URL / getConsoleLog:
  - returns:
      - consoleLog: a list of logs in form of {msg: msg, lineNum: lineNum, sourceId: sourceId}


* $URL / destroy:
  - returns:
      - success: boolean (true/false) if opening the url was successful


* $URL / getCookies:
  - returns:
      - cookies: a list of cookies

# Tests

## Running tests

```npm run test_webkit``` or ```npm run test_gecko``` will run only individual engines. ```npm test``` will run tests on both gecko and webkit.

Individual test files can bun run ```node_modules/.bin/mocha --timeout 60000 tests/integration/...```

## Test file structure

```js
"use strict";

let setup = require('../init'),
  should = require('should');

describe('something', () => {
  let client;
  beforeEach((done) => {
    setup.start(process.env.ENGINE, (error, c) => {
      client = c;
      done(error);
    });
  });

  afterEach((done) => {
    client.destroy().then(() => {
      setup.stop(done);
    }).catch(done);
  });

  describe('something', () => {
    it('should be dangerous', (done) => {
      client.open({url : ...})
        .then((result) => {
          ..
          done();
        })
       .catch(done)
    });
  })
});
```