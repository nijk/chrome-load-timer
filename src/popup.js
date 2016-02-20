'use strict';

var Popup = function Popup (timings) {
    // Set up instance vars
    this.timingsAll = timings.slice(0);
    this.timing = timings.pop();
    this.timingsPrev = timings;

    this.start = 0;
    this.total = 0;
    this.mean = 0;

    this.setStart()
        .setTotal()
        .setMean();

};

Popup.prototype = {
    // Setup instance methods

    formatTime: function (time) {
        return (time / 1000).toFixed(3).substring(0, 5).toString();
    },

    setStart: function () {
        this.start = this.getTimingStart(this.timing);
        return this;
    },

    setTotal: function () {
        this.total = this.timing.loadEventEnd - this.start;
        return this;
    },

    setMean: function () {
        var accumulatedTime = this.timingsAll.reduce(function (prev, item) {
            return prev + this.getTimingTotal(item);
        }.bind(this), 0);

        this.mean = accumulatedTime / this.timingsAll.length;
        return this;
    },

    getTimingStart: function (timing) {
        return (timing.redirectStart == 0) ? timing.fetchStart : timing.redirectStart;
    },

    getTimingTotal: function (timing) {
        console.info('getTimingTotal', timing.loadEventEnd - this.getTimingStart(timing));
        return timing.loadEventEnd - this.getTimingStart(timing);
    }
};



// Run stuff
chrome.tabs.query({ active: true, status: 'complete' }, function(tabs) {
    var tab = tabs.shift();
    var acc = 0;
    var tabName, timings, popup, timing, start, total;

    if (tab) {
        tabName = 'tab' + tab.id;
        chrome.storage.local.get('cache', function (data) {
            timings = data.cache[tabName];
            popup = new Popup(timings);
            timing = popup.timing;
            start = popup.start;
            total = popup.total;

            // Do stuff with popup
            console.info('Total Time', popup.formatTime(popup.total), popup);

            function updateRow (id, start, duration, noacc) {
                var x = Math.round(start / total * 300);
            
                if (!noacc) acc += duration;
                
                document.getElementById(id + 'When').innerHTML = popup.formatTime(start);
                document.getElementById(id).innerHTML = popup.formatTime(duration);
                document.getElementById(id + 'Total').innerHTML = noacc ? '-' : popup.formatTime(acc);
                document.getElementById('r-' + id).style.cssText =
                    'background-size:' + Math.round(duration / total * 300) + 'px 100%;' +
                    'background-position-x:' + (x >= 300 ? 299 : x) + 'px;';
            };

            // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#processing-model
            updateRow('redirect', 0, timing.redirectEnd - timing.redirectStart);
            updateRow('dns', timing.domainLookupStart - start, timing.domainLookupEnd - timing.domainLookupStart);
            updateRow('connect', timing.connectStart - start, timing.connectEnd - timing.connectStart);
            updateRow('request', timing.requestStart - start, timing.responseStart - timing.requestStart);
            updateRow('response', timing.responseStart - start, timing.responseEnd - timing.responseStart);
            updateRow('dom', timing.domLoading - start, timing.domComplete - timing.domLoading);
            updateRow('domInteractive', timing.domInteractive - start, 0, true);
            updateRow('contentLoaded', timing.domContentLoadedEventStart - start,
                timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart, true);
            updateRow('load', timing.loadEventStart - start, timing.loadEventEnd - timing.loadEventStart);
            
            document.querySelector('#footer-total .totals').innerHTML = popup.formatTime(total);

            if (timings.length > 1) {
                var $timings = document.querySelector('#timings'),
                    $fragment = document.createDocumentFragment(),
                    $wrapper = document.createElement('div'),
                    $label = document.createElement('h3'),
                    $totals = document.createElement('ol'),
                    $meanWrapper = document.createElement('div'),
                    $meanLabel = document.createElement('h3'),
                    $meanTotal = document.createElement('h3');

                $label.appendChild(document.createTextNode('Previous totals'));
                $label.classList.add('lbl');

                $totals.classList.add('totals');

                $meanLabel.appendChild(document.createTextNode('Average (mean) total'));
                $meanTotal.appendChild(document.createTextNode(popup.formatTime(popup.mean)));
                $meanLabel.classList.add('lbl');

                $wrapper.id = 'previous-totals';
                $wrapper.classList.add('row', 'footer-row');

                $meanWrapper.id = 'mean-total';
                $meanWrapper.classList.add('row', 'footer-row');

                popup.timingsPrev.reverse().forEach(function (item) {
                    var $elem = document.createElement('li');
                    var itemTotal = popup.getTimingTotal(item);

                    if (total * 0.9 < itemTotal) {
                        $elem.classList.add('total--faster');
                    }

                    if (total * 0.9 > itemTotal) {
                        $elem.classList.add('total--slower');
                    }

                    $elem.classList.add('total');
                    $elem.appendChild(document.createTextNode(popup.formatTime(itemTotal)));
                    $totals.appendChild($elem);
                });

                $wrapper.appendChild($label);
                $wrapper.appendChild($totals);
                $fragment.appendChild($wrapper);
                $timings.appendChild($fragment);
            }

        });
    }
});