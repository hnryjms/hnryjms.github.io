---
layout: post
title:  "Building a Clean JavascriptCore App for iOS in Swift"
summary: "Article Summary"
---
Hey, we know React Native, the tool for building JS apps using native UI components for mobile platforms. But over the
last few years, the community has moved away from using system UI components—just take a look at the primary navigation
library in React Native, [React Navigation][rn-nav]{:target="_blank"}. They rebuilt iOS and Android navigation paradigms
from scratch. And that means it's hard for React Native apps to utilize newer iOS features, like iOS 11's large titles,
layout constraints and more.

But running JavaScript code within an iOS app can be a lot easier than you think. [JavascriptCore][jscore]{:target="_blank"}
is the engine behind React Native, and you can build high-performance apps and integrate the latest features of iOS.

[rn-nav]: https://reactnavigation.org
[jscore]: https://developer.apple.com/documentation/javascriptcore
