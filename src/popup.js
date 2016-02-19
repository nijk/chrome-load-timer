'use strict';

var Popup = function Popup (timings) {
    // Set up instance vars
    this.timing = timings.pop();
    this.timingsPrev = timings;

    this.timingStart = 0;
    this.timingTotal = 0;

    this.setTimingStart()
        .setTotalTime();

};

Popup.prototype = {
    // Setup instance methods
    setTimingStart: function () {
        this.timingStart = (this.timing.redirectStart == 0) ? this.timing.fetchStart : this.timing.redirectStart;
        return this;
    },

    setTotalTime: function () {
        this.timingTotal = this.timing.loadEventEnd - this.timingStart;
        return this;
    }

};

// Run stuff
chrome.tabs.query({ active: true, status: 'complete' }, function(tabs) {
    var tab = tabs.shift();
    var tabName, popup;

    if (tab) {
        tabName = 'tab' + tab.id;
        chrome.storage.local.get('cache', function (data) {
            var timings = data.cache[tabName];

            popup = new Popup(timings);

            // Do stuff with popup
            console.info('Total Time', popup);
        });
    }
});