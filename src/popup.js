// https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#processing-model
var acc = 0,
    timings = [
        {
            name: 'redirect',
            calc: function (t, name) {
                return {
                    start: 0,
                    length: t[name + 'End'] - t[name + 'Start']
                };
            }
        },
        { name: 'domainLookup', title: 'dns'},
        { name: 'connect' },
        {
            name: 'request',
            calc: function (t) {
                return {
                    start: t.requestStart - calculateStart(t),
                    length: t.responseStart - t.requestStart
                };
            }
        },
        { name: 'response' },
        {
            name: 'dom',
            calc: function (t) {
                return {
                    start: t.domLoading - calculateStart(t),
                    length: t.domComplete - t.domLoading
                };
            }
        },
        {
            name: 'domInteractive',
            noacc: true,
            calc: function (t) {
                return {
                    start: t.domInteractive - calculateStart(t),
                    length: 0
                };
            }
        },
        {
            name: 'domContentLoadedEvent',
            title: 'contentLoaded',
            noacc: true,
            calc: function (t, name) {
                return {
                    start: t[name + 'Start'] - calculateStart(t),
                    length: t[name + 'End'] - t[name + 'Start']
                };
            }
        },
        { name: 'loadEvent', title: 'load'}
    ];

function calculateStart (timing) {
    return (timing.redirectStart == 0) ? timing.fetchStart : timing.redirectStart;
}

function calculateTiming (t, name) {
    return {
        start: t[name + 'Start'] - calculateStart(t),
        length: t[name + 'End'] - t[name + 'Start']
    };
}

function calculateTimingTotal (timing) {
    return timing.loadEventEnd - calculateStart(timing);
}

function calculateTimingMean(timingData) {
    var accumulatedTime = timingData.reduce(function (prev, curr) {
        return prev + calculateTimingTotal(curr);
    }, 0);

    return accumulatedTime / timingData.length;
}

function formatTiming (total) {
    return (total / 1000).toFixed(3).substring(0, 5).toString();
}

function createTimingRow (timing, total) {
    var bgWidth = Math.round(timing.start / total * 300);
    var $timingRow, $timingLabel, $timingStart, $timingEnd, $timingTotal;

    if (!timing.noacc) acc += timing.length;

    $timingRow = document.createElement('div');
    $timingRow.classList.add('timing-row', 'timing-' + timing.title.toLowerCase());

    $timingLabel = document.createElement('span');
    $timingLabel.appendChild(document.createTextNode(timing.title));
    $timingLabel.classList.add('timing-title', 'lbl');

    $timingStart = document.createElement('span');
    $timingStart.appendChild(document.createTextNode(formatTiming(timing.start)));
    $timingStart.classList.add('timing-start');

    $timingEnd = document.createElement('span');
    $timingEnd.appendChild(document.createTextNode(formatTiming(timing.length)));
    $timingEnd.classList.add('timing-end');

    $timingTotal = document.createElement('span');
    $timingTotal.appendChild(document.createTextNode(timing.noacc ? '-' : formatTiming(acc)));
    $timingTotal.classList.add('timing-total');


    $timingRow.appendChild($timingLabel);
    $timingRow.appendChild($timingStart);
    $timingRow.appendChild($timingEnd);
    $timingRow.appendChild($timingTotal);

    $timingRow.setAttribute('style',
        'background-size:' + Math.round(timing.length / total * 300) + 'px 100%;' +
        'background-position-x:' + (bgWidth >= 300 ? 299 : bgWidth) + 'px;'
    );

    return $timingRow;
}

function createTimingTotalRow (total) {
    var $timingTotalRow, $timingTotalLabel, $timingTotal;

    $timingTotalRow = document.createElement('div');
    $timingTotalRow.classList.add('timing-row', 'footer-row');

    $timingTotalLabel = document.createElement('h3');
    $timingTotalLabel.appendChild(document.createTextNode('Total'));
    $timingTotalLabel.classList.add('lbl');

    $timingTotal = document.createElement('h3');
    $timingTotal.appendChild(document.createTextNode(formatTiming(total)));
    $timingTotal.classList.add('totals');

    $timingTotalRow.appendChild($timingTotalLabel);
    $timingTotalRow.appendChild($timingTotal);

    return $timingTotalRow;
}

function createPreviousTimings (timingData, currentTotal, timingMeanTotal) {
    var $wrapper = document.createElement('div');
    var $label = document.createElement('h3');
    var $totals = document.createElement('ol');
    var $meanWrapper = document.createElement('div');
    var $meanLabel = document.createElement('h3');
    var $meanTotal = document.createElement('h3');

    $label.appendChild(document.createTextNode('Previous totals'));
    $label.classList.add('lbl');

    $totals.classList.add('totals');

    $meanLabel.appendChild(document.createTextNode('Average (mean) total'));
    $meanTotal.appendChild(document.createTextNode(formatTiming(timingMeanTotal)));
    $meanLabel.classList.add('lbl');

    $wrapper.id = 'previous-totals';
    $wrapper.classList.add('timing-row', 'footer-row');

    $meanWrapper.id = 'mean-total';
    $meanWrapper.classList.add('timing-row', 'footer-row');

    timingData.reverse().forEach(function (timing) {
        var $elem = document.createElement('li');
        var total = calculateTimingTotal(timing);

        if (total * 0.9 < currentTotal) $elem.classList.add('total--faster');
        if (total * 0.9 > currentTotal) $elem.classList.add('total--slower');

        $elem.classList.add('total');
        $elem.appendChild(document.createTextNode(formatTiming(total)));
        $totals.appendChild($elem);
    });

    $wrapper.appendChild($label);
    $wrapper.appendChild($totals);

    return $wrapper;
}

chrome.tabs.query({ active: true, status: 'complete' }, function(tabs) {
    var tab = tabs[0];
    var tabName;
    var timingData, timingMeanTotal, t, timing, total;
    var $timings, $fragment;

    chrome.storage.local.get('cache', function (data) {
        tabName = 'tab' + tab.id;

        if (tab && data.cache[tabName]) {
            timingData = data.cache[tabName];
            timingMeanTotal = calculateTimingMean(timingData);
            t = timingData.pop();
            total = calculateTimingTotal(t);

            $timings = document.querySelector('#timings');
            $fragment = document.createDocumentFragment();

            timings.map(function (item) {
                timing = (typeof item.calc === 'function') ? item.calc.call(this, t, item.name) : calculateTiming(t, item.name);
                timing.title = item.title || item.name;
                timing.noacc = item.noacc || false;

                $fragment.appendChild(createTimingRow(timing, total));
            });

            $fragment.appendChild(createTimingTotalRow(total));

            if (timingData.length > 1) {
                $fragment.appendChild(createPreviousTimings(timingData, total, timingMeanTotal));
            }

            $timings.appendChild($fragment);
        }
    });
});