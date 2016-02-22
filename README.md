This extension measures page load time and displays it in the toolbar.
Web Timing API is used for precise measurement.

Icons are from Human-O2 iconset 
http://schollidesign.deviantart.com/art/Human-O2-Iconset-105344123

# Install

To install the plugin, simply clone this repository and [follow the instructions here](https://developer.chrome.com/extensions/getstarted#unpacked).

*Tip: Reload the webpage a multiple times to see a history of previous load timings and average load time!* 

# Approach

The purpose of this forked project is to build upon the great work done by [Alexander Vykhodtsev](https://github.com/alex-vv) 
on [chrome-load-timer](https://github.com/alex-vv/chrome-load-timer).
 
In this project I have focused on imrovements & additions to these areas:
 
1. Improve the UI to allow the context of the timing data to be more easily digested
2. Add further data: Previous load timing totals & an average timing total
3. Refactor the code to achieve the following:
 	1. Separate styling from content, refactor styling using a BEM style approach
 	2. Implement a prototypal pattern with useful methods, allowing for easier future development
 	3. Implement a DOM manipulation pattern, generating content on page load
 	  
# Considerations

The DOM manipulation pattern has reduced a lot of static markup in `info.html` whilst at the same time introduced a 
DOM manipulation dependency and additionally has resulted in the creation of a great deal of boilerplate code to create
the required markup.

I have considered various approaches to the DOM manipulation problem during this project, here is a summary of my thoughts on each:

1. **Static markup**: Terse and simple, however somewhat limiting if the content needs to be updated on user interaction
2. **DOM manipulation (jQuery style)**: Dynamic with a small dependency, however the code base has become littered with 
boilerplate code that generates the markup, tightly coupling the timing logic with content generation.
3. **Client side templating**: Decoupled approach with cleaner code, however at the cost of using a larger dependency 
I originally discounted this approach. On reflection, it would probably be the best approach for separation of concerns 
between the timing logic and content generation, in addition future maintainability of the code should be easier.
4. **Framework (Backbone/Angular/React)**: Dynamic and powerful, however it this approach would be far too heavyweight 
for a simple plugin popup.


# Todo
1. Refactor DOM manipulation pattern in favour of a Client side templating implementation
2. Add (% faster/slower) to main total
3. Provide functionality to review timings table from click any previous totals, plus a way to revert to current timings

# License 

This project is licensed under the terms of the MIT license.
