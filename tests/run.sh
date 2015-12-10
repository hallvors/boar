#!/bin/bash

# This will run both webkit and gecko and fail if either one fails

STATUS=0

ENGINE=gecko node_modules/.bin/mocha --harmony --recursive tests || STATUS=$?
ENGINE=webkit node_modules/.bin/mocha --harmony --recursive tests || STATUS=$?

exit $STATUS