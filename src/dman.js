(function (name, context) {
    var results = [];
    var selector;

    var utils = {
        create: function (tag, html, attrs) {
            if (!tag) return;
            var el = document.createElement(tag);

            if (html) {
                if (!Array.isArray(html)) {
                    html = [html];
                }

                for (var i = 0; i < html.length; i++) {
                    var child = ('string' === typeof html[i]) ? document.createTextNode(html[i]) : html[i];
                    el.appendChild(child);
                }
            }

            if (attrs) {
                for (var key in attrs) {
                    if ('id' === key) {
                        el.id = attrs[key];
                    } else if ('class' === key) {
                        var classes = attrs[key];
                        DOMTokenList.prototype.add.apply(el.classList, Array.isArray(classes) ? classes : [classes]);
                    } else {
                        el.setAttribute(key, attrs[key]);
                    }
                }
            }

            return el;
        }
    };

    var init = function (currentSelector) {
        selector = currentSelector;
        return new Query();
    };

    var Query = function () {
        if (selector) {
            results = document.querySelectorAll(selector);
        }

        this.length = results.length;

        results.forEach(function(item, index) {
            this[index] = item;
        }, this);

        return this;
    };

    // Mix-in the Utility methods
    for (var i in utils) {
        init[i] = utils[i];
    }

    Query.prototype = {
        splice: [].splice, // Required to return Array-like results

        append: function (html) {
            if (results) {
                for (var i = results.length; i--;) {
                    results.item(i).appendChild(html);
                }
            }

            return this;
        }
    };

    return context[name] = init;
})('$', window);