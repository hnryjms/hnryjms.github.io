---
layout: post
title:  "Extend React Native with Native Apple Code"
summary: "Build native iOS features like Layout Contraints, Peek & Pop, and Navigation with a React Native backend"
---
At HouseRater, we launched a comprehensive mobile app built completely with [React Native][rn]. We built the app from
scratch, and followed many best practices from the React Native community, including some painful upgrades as 3rd party
modules grew with the developer community. It's been is a big success on iPad, and we're really happy with the code
behind our app.

We recently started a new endeavor. **It's time to make our app universal; and run on iPhone and iPad** (sorry
*Android*). And we need great support of hardware features on iPhone XS/XR/X/8 . . 4, and iOS 12. But *React Native is
not good at this*, and Apple's developer tooling is compulsory to use the latest tech.

Say hello to [`react-native-ui-native`][rnuin]. It's a project that allows you to build native UI screens with Apple's
powerful [Interface Builder][ib] while loading JS application data through your existing `RCTBridge`. Providing helpers
for moving data between your JS bundle and the native UI, this project lets you write Swift/Objective-C view controllers
that can utilize truly native Apple components, like Layout Constraints, Peek & Pop, and Navigation Bars.

Let's try it out.

### Building Native Apps

First, we're going to start from a fresh `HelloWorld` app generated from `react-native init`, and extend it with the
native Split View (which automatically collapses on smaller iPhone devices), Navigation Bars and Tables.

DRAFT:

```objective-c
AppDelegate.h -> storing RCTBridge
```

Configure `xcodeproj` to use Main Storyboard at launch.

Lay out initial view. Table, w/ Large Titles

Wire up cells to JS values.

Push to a new controller.

Update label via `fetch()`

🎉 There you have it.

Also, there is an example project inside `react-native-ui-native` that includes Split View, Navigation and Tables just
like the guide above. [Download the code][rnuin] to try this out!

### Extending Existing JS Apps

Hey...you have a React Native app today, but need new views that access the latest features of iOS. Let's take a look at
how we can trigger native UI code to launch out of our base `RCTRootView` from an existing app.

We'll launch a new storyboard from a JS event using `AppDelegate.m` and our root view controller.

```diff
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
+
+ [RNUINativeManager addEventListener:@"NativeDocList.launchView" eventBlock:^(id data) {
+   UIStoryboard *mainStory = [UIStoryboard storyboardWithName:@"Main" bundle:[NSBundle mainBundle]];
+   UIViewController *initialView = [mainStory instantiateInitialViewController];
+   [rootViewController presentViewController:initialView animated:YES callbackBlock:nil];
+ }];
+ 
  self.window.rootViewController = rootViewController;
```

From here, iOS will present your new storyboard as a modal, and you'll be able to build perfect view controllers for
your existing native app using Swift/Objective-C view controllers designed in Interface Builder.

### Moving Forward

I lead the development of an iPad app completely in React Native, even with my background in native iOS development.
This was the right decision at our small business as a team of JS developers could contribute without learning a new
language. We're still glad to share constants, functions and other JS code from our server & web app into the mobile
app.

But if I were making the decision again, I'd opt to use [`JSVirtualMachine()`][swift-js]'s native APIs to run the
backend of our mobile app, with a simple [Webpack][webpack] bundle.

[rn]: https://facebook.github.io/react-native/
[rnuin]: https://github.com/houserater/react-native-ui-native
[ib]: https://developer.apple.com/xcode/interface-builder/
[swift-js]: https://medium.com/swift-programming/from-swift-to-javascript-and-back-fd1f6a7a9f46
[webpack]: https://webpack.js.org
