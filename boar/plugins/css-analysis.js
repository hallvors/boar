var fs = require('fs');

var CSSAnalyzer = function (page) {
    'use strict';
    this.init(page);
};

CSSAnalyzer.prototype.init = function (page) {
    'use strict';
    var self = this;
    self.name = "css-analyzer";
    self.res = [];
    self._page = page;
};

CSSAnalyzer.prototype.onLoadFinished = function () {
    var self = this;
    self.res = self._page.evaluate(analyze);
};

CSSAnalyzer.prototype.getResult = function () {
    var self = this;
    return self.res;
};

function analyze() {
    /*
    Analyses applied CSS and sums up findings
    We want to return a list of objects referring to elements
    in the page with the following details:
        selector: a CSS selector that will match the element (not necessarily the one in the CSS)
        index: the index of the element in the selection you get
               if you do document.querySelectorAll(selector)
        coords: {x: y: width: height: }
        problems: [ {property: value: } ]
    */
    /*TODO:

    Perhaps unsurprising, a major issue with this approach is performance.
    It might not seem like a big problem for something that can run by itself
    and record data at leisure, but slow performance makes it time consuming to
    test and develop.. ALSO we have a 5 second deadline due to ping timeouts
    */
    if(!('webkitAnimation' in document.documentElement.style)){
        return;
    }
    var list = [];
    var neutralFrame = document.body.appendChild(document.createElement('iframe'));
    var comparisonStyle = cloneobj(neutralFrame.contentWindow.getComputedStyle(neutralFrame.contentDocument.body));
    document.body.removeChild(neutralFrame);

    var elms = document.querySelectorAll('div,nav,li');
    var css_properties = ['webkitAnimation', 'webkitTransition', 'webkitTransform'];
    var css_values = ['-webkit-gradient', '-webkit-flex', '-webkit-box'];
    var ignore_values = ['', 'none']; // maybe 'auto' too?

    for (var i = 0, elm; elm = elms[i]; i++) {
        var coords = elm.getBoundingClientRect();
        var tmp = createCSSSelector(elm);
        var obj = { selector: tmp[0].join(' '), index: tmp[1], coords: cloneobj(coords), problems: [] };
        var style = getComputedStyle(elm);

        // property test
        for (var j = 0, css; css = css_properties[j]; j++) {
            // This is where we should figure out if the value is set or default..
            if (style[css] !== comparisonStyle[css] && ignore_values.indexOf(style[css]) === -1) {
                obj.problems.push({ property: css, value: style[css] });
            }
        }

        // value test
        for (var prop in style) {
            if (isNaN(parseInt(prop)) && prop !== 'cssText') {// We skip the numerical lists of properties
                for (j = 0, css; css = css_values[j]; j++) {
                    if (style[prop] && style[prop].toString().indexOf(css) > -1) {
                        obj.problems.push({ property: prop, value: style[prop] });
                    }
                }
            }
        }

        if (obj.problems.length) {
            list.push(obj);
        }
    }

    return list;

    function createCSSSelector(elm) {
        var desc = '', descParts = [], origElm = elm;
        while (elm) {
            descParts.unshift(descElm(elm));
            desc = descParts.join(' ');
            try {
                document.querySelectorAll(desc);
            } catch (e) {
                console.log('FAILED generated selector: ' + desc + '\n' + e) ;
            }
            if (document.querySelectorAll(desc).length === 1 || descParts.length > 5) {
                break;
            }
            elm = elm.parentElement;
        }
        var elms = document.querySelectorAll(desc), idx;
        for (var i = 0; i < elms.length; i++) {
            if (elms[i] === origElm) {
                idx = i;
                break;
            }
        }
        return [descParts, i];
    }

    function descElm(elm) {
        var desc = elm.tagName.toLowerCase();
        if (elm.id) {
            desc += '#' + CSSEscape(elm.id);
        }
        if (elm.classList.length) {
            [].forEach.call(elm.classList, function (theClass) {
                desc += '.' + CSSEscape(theClass);
            });
            //           desc += '.' + [].join.call(elm.classList, '.');
        }
        if (elm.href) {
            //desc += '[href="' + elm.href + '"]';
        }
        return desc;
    }

    function cloneobj(rect) {
        var obj = {};
        for (var prop in rect) {
            obj[prop] = rect[prop];
        }
        return obj;
    }

    var InvalidCharacterError = function (message) {
        this.message = message;
    };

    InvalidCharacterError.prototype = new Error();
    InvalidCharacterError.prototype.name = 'InvalidCharacterError';

    /*! https://mths.be/cssescape v0.2.1 by @mathias | MIT license */
    function CSSEscape(value) {
        var string = String(value);
        var length = string.length;
        var index = -1;
        var codeUnit;
        var result = '';
        var firstCodeUnit = string.charCodeAt(0);
        while (++index < length) {
            codeUnit = string.charCodeAt(index);
            // Note: there’s no need to special-case astral symbols, surrogate
            // pairs, or lone surrogates.

            // If the character is NULL (U+0000), then throw an
            // `InvalidCharacterError` exception and terminate these steps.
            if (codeUnit == 0x0000) {
                throw new InvalidCharacterError(
                    'Invalid character: the input contains U+0000.'
                    );
            }

            if (
                // If the character is in the range [\1-\1F] (U+0001 to U+001F) or is
                // U+007F, […]
                (codeUnit >= 0x0001 && codeUnit <= 0x001F) || codeUnit == 0x007F ||
                // If the character is the first character and is in the range [0-9]
                // (U+0030 to U+0039), […]
                (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
                // If the character is the second character and is in the range [0-9]
                // (U+0030 to U+0039) and the first character is a `-` (U+002D), […]
                (
                    index == 1 &&
                    codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
                    firstCodeUnit == 0x002D
                    )
                ) {
                // http://dev.w3.org/csswg/cssom/#escape-a-character-as-code-point
                result += '\\' + codeUnit.toString(16) + ' ';
                continue;
            }

            // If the character is not handled by one of the above rules and is
            // greater than or equal to U+0080, is `-` (U+002D) or `_` (U+005F), or
            // is in one of the ranges [0-9] (U+0030 to U+0039), [A-Z] (U+0041 to
            // U+005A), or [a-z] (U+0061 to U+007A), […]
            if (
                codeUnit >= 0x0080 ||
                codeUnit == 0x002D ||
                codeUnit == 0x005F ||
                codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
                codeUnit >= 0x0041 && codeUnit <= 0x005A ||
                codeUnit >= 0x0061 && codeUnit <= 0x007A
                ) {
                // the character itself
                result += string.charAt(index);
                continue;
            }

            // Otherwise, the escaped character.
            // http://dev.w3.org/csswg/cssom/#escape-a-character
            result += '\\' + string.charAt(index);

        }
        return result;
    }
}

try {
    if (exports) {
        exports.Plugin = CSSAnalyzer;
    }
} catch (ex) {
    CSSAnalyzer = module.exports;
}
