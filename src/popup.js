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

function createPreviousTimings (timingData, currentTotal, timingMeanTotal) {
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
    $meanTotal.appendChild(document.createTextNode(formatTiming(timingMeanTotal)));
    $meanLabel.classList.add('lbl');

    $wrapper.id = 'previous-totals';
    $wrapper.classList.add('row', 'footer-row');

    $meanWrapper.id = 'mean-total';
    $meanWrapper.classList.add('row', 'footer-row');

    timingData.reverse().forEach(function (timing) {
        var $elem = document.createElement('li'),
            total = calculateTimingTotal(timing);

        if (total * 0.9 < currentTotal) {
            $elem.classList.add('total--faster');
        }

        if (total * 0.9 > currentTotal) {
            $elem.classList.add('total--slower');
        }

        $elem.classList.add('total');
        $elem.appendChild(document.createTextNode(formatTiming(total)));
        $totals.appendChild($elem);
    });

    $wrapper.appendChild($label);
    $wrapper.appendChild($totals);
    $fragment.appendChild($wrapper);
    $timings.appendChild($fragment);
}

chrome.tabs.query({ active: true, status: 'complete' }, function(tabs) {
    var tab = tabs[0];
    if (tab) {
        chrome.storage.local.get('cache', function (data) {
            var timingData = data.cache['tab' + tab.id],
                timingMeanTotal = calculateTimingMean(timingData),
                t = timingData.pop(),
                start = (t.redirectStart == 0) ? t.fetchStart : t.redirectStart,
                total = calculateTimingTotal(t);

            timings.map(function (item) {
                var timing = (typeof item.calc === 'function') ? item.calc.call(this, t, item.name) : calculateTiming(t, item.name);
                timing.title = item.title || item.name;
                timing.noacc = item.noacc || false;
                return timing;
            }).reduce(function (prev, curr) {
                console.info('timing', curr.title, curr);
                var x = Math.round(curr.start / total * 300);

                if (!curr.noacc) {
                    acc += curr.length;
                }

                document.getElementById(curr.title + 'When').innerHTML = formatTiming(curr.start);
                document.getElementById(curr.title).innerHTML = formatTiming(curr.length);
                document.getElementById(curr.title + 'Total').innerHTML = curr.noacc ? '-' : formatTiming(acc);
                document.getElementById('r-' + curr.title).style.cssText =
                    'background-size:' + Math.round(curr.length / total * 300) + 'px 100%;' +
                    'background-position-x:' + (x >= 300 ? 299 : x) + 'px;';
            }, {});

            document.querySelector('#footer-total .totals').innerHTML = formatTiming(total);

            if (timingData.length > 1) {
                createPreviousTimings(timingData, total, timingMeanTotal);
            }
        });
    }
});