'use strict';

var Popup = function Popup (timings) {
    // Set up instance vars
    this.timingsAll = timings.slice(0);
    this.timing = timings.pop();
    this.timingsPrev = timings;
    this.setStart().setTotal().setMean();
};

Popup.prototype = {
    setStart: function () {
        this.start = this.getTimingStart(this.timing);
        return this;
    },

    setTotal: function () {
        this.total = this.timing.loadEventEnd - this.start;
        return this;
    },

    setMean: function () {
        var accumulatedTotals = this.timingsAll.reduce(function (prev, item) {
            return prev + this.getTimingTotal(item);
        }.bind(this), 0);

        this.mean = (accumulatedTotals / this.timingsAll.length).toFixed(0);
        return this;
    },

    getTimingStart: function (timing) {
        return (timing.redirectStart == 0) ? timing.fetchStart : timing.redirectStart;
    },

    getTimingTotal: function (timing) {
        return timing.loadEventEnd - this.getTimingStart(timing);
    },

    formatTime: function (time, showAbsoluteZero) {
        if (0 === time && !showAbsoluteZero) return '';
        return (time / 1000).toFixed(3).substring(0, 5).toString();
    }
};

// Create the timing popup from the window.performance data in localStorage
chrome.tabs.query({ active: true, status: 'complete' }, function(tabs) {
    var tab = tabs.shift();
    var accumulatedTotal = 0;
    var tabName, timings, popup, timing, start, total;
    var $fragment, $timings;
    var $resultRow, $resultLabel, $resultStart, $resultDuration, $resultEnd;
    var $totalRow, $totalLabel, $total;
    var $previousWrapper, $totals, $previousTotals, $previousLabel, $previousLabelSpan, $previousTotal, $difference;
    var $meanWrapper, $meanLabel, $meanTotal;

    if (tab) {
        tabName = 'tab' + tab.id;
        chrome.storage.local.get('cache', function (data) {
            timings = data.cache[tabName];
            popup = new Popup(timings);
            timing = popup.timing;
            start = popup.start;
            total = popup.total;

            $timings = $('#timings');
            $fragment = document.createDocumentFragment();

            function updateRow (title, start, duration, noTotal) {
                var x = Math.round(start / total * 300);
                var rowTotal = (noTotal) ? '-' : popup.formatTime(accumulatedTotal);
                var bgWidth = Math.round(duration / total * 300);
                var bgPos = (x >= 300 ? 299 : x);
                var rowID = 'result-' + title.toLowerCase().replace(' ', '-');
                if (!noTotal) accumulatedTotal += duration;

                $resultLabel = $.create('span', title, { class: 'lbl' });
                $resultStart = $.create('span', popup.formatTime(start), { class: 'result-start' });
                $resultDuration = $.create('span', popup.formatTime(duration), { class: 'result-duration' });
                $resultEnd = $.create('span', rowTotal, { class: 'result-end' });
                $resultRow = $.create('div', [$resultLabel, $resultStart, $resultDuration, $resultEnd], {
                    id: rowID,
                    class: 'row'
                });

                setTimeout(function () {
                    document.getElementById(rowID).style.cssText = 'background-size:' + bgWidth + 'px 100%; background-position-x:' + bgPos + 'px;';
                }, 300);

                $fragment.appendChild($resultRow);
            }

            // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#processing-model
            updateRow('Redirect', 0, timing.redirectEnd - timing.redirectStart);
            updateRow('DNS', timing.domainLookupStart - start, timing.domainLookupEnd - timing.domainLookupStart);
            updateRow('Connect', timing.connectStart - start, timing.connectEnd - timing.connectStart);
            updateRow('Request', timing.requestStart - start, timing.responseStart - timing.requestStart);
            updateRow('Response', timing.responseStart - start, timing.responseEnd - timing.responseStart);
            updateRow('DOM', timing.domLoading - start, timing.domComplete - timing.domLoading);
            updateRow('Interactive', timing.domInteractive - start, 0, true);
            updateRow('Content loaded', timing.domContentLoadedEventStart - start, timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart, true);
            updateRow('Load event', timing.loadEventStart - start, timing.loadEventEnd - timing.loadEventStart);

            $totalLabel = $.create('h3', 'Total', { class: 'lbl' });
            $total = $.create('h3', popup.formatTime(total), { class: 'totals' });
            $totalRow = $.create('div', [$totalLabel, $total], { id: 'footer-total', class: ['row', 'footer-row'] });
            $fragment.appendChild($totalRow);

            if (timings.length > 1) {
                $previousLabelSpan = $.create('span', '(% faster/slower than mean)', { class: 'difference' });
                $previousLabel = $.create('h3', ['Previous totals', $previousLabelSpan], { class: 'lbl' });
                $meanLabel = $.create('h3', 'Average (mean) total', { class: 'lbl' });
                $meanTotal = $.create('h3', popup.formatTime(popup.mean), { class: 'totals' });
                $meanWrapper = $.create('div', [$meanLabel, $meanTotal], { id: 'mean-total', class: ['row', 'footer-row', 'additional-info'] });

                $previousTotals = popup.timingsPrev.reverse().map(function (previous) {
                    var previousTotal = popup.getTimingTotal(previous);

                    console.info('Previous total', previousTotal, (previous.loadEventEnd - previous.fetchStart), popup.timingsPrev);

                    var classes = ['total'];
                    var difference = '';
                    var percentageDifference = (((previousTotal / popup.mean) * 100) - 100).toFixed(0);

                    if (percentageDifference < -10) {
                        difference = '(' + percentageDifference.substring(1) + '% faster)';
                        classes.push('total--faster');
                    }
                    if (percentageDifference > 10) {
                        difference = '(' + percentageDifference + '% slower)';
                        classes.push('total--slower');
                    }

                    $difference = $.create('span', difference, { class: 'difference' } );
                    $previousTotal = $.create('span', popup.formatTime(previousTotal), { class: 'previous-total' });
                    return $.create('li', [$difference, $previousTotal], { class: classes });
                });

                $totals = $.create('ol', $previousTotals, { class: 'totals' });
                $previousWrapper = $.create('div', [$previousLabel, $totals], { id: 'previous-totals', class: ['row', 'footer-row', 'additional-info']});
                $fragment.appendChild($previousWrapper);
                $fragment.appendChild($meanWrapper);
            }
            setTimeout(function () {
                $timings.append($fragment);
            }, 100);
        });
    }
});
