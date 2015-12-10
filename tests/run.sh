#!/bin/bash

# This will run both webkit and gecko and fail if either one fails

# It isn't using npm test_webkit and test_gecko scripts because they
# will hide true exit code(otherwise when they would be run and they would fail
# it would produce ugly npm failure output)

STATUS=0

ENGINE=gecko node_modules/.bin/mocha --harmony --recursive --timeout 60000 tests || STATUS=$?
ENGINE=webkit node_modules/.bin/mocha --harmony --recursive --timeout 60000 tests || STATUS=$?

exit $STATUS