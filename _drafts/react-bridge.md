---
layout: post
title:  "Extend React Native with Native Apple Code"
summary: "Build native iOS features like Layout Contraints, Peek & Pop, and Navigation with a React Native backend"
---
At HouseRater, we launched a comprehensive mobile app built completely with [React Native][rn]. We built the app from
scratch, and followed many best practices from the React Native community, including some painful upgrades as 3rd party
modules grew with the developer community. It's been is a big success on iPad, and we're really happy with the code
behind our app.

We recently started a new chapter. **It's time to make our app universal; for running on both iPhone and iPad** (sorry
*Android*). And we need great support of hardware features on iPhone XS/XR/X/8 . . 4, and iOS 12. But *React Native is
not good at this*, and Apple's developer tooling is compulsory when useing the latest tech.

Say hello to [`react-native-ui-native`][rnuin]. It's a project that allows you to build native UI screens with Apple's
powerful [Interface Builder][ib] while loading JS application data through your existing `RCTBridge`. Providing helpers
for moving data between your JS bundle and the native UI, this project lets you write Swift/Objective-C view controllers
that can utilize truly native Apple components, like Layout Constraints, Peek & Pop, and Navigation Bars.

Let's try it out 📱

### Building an Example Native App

As an example, we're going to start from a fresh `HelloWorld` app generated with `react-native init`, and extend it
to include the iOS-native Split View, Navigation Bars and Tables, using data from Javascript. This is really similar to
the example project included in `react-native-ui-native` source code. The steps below, along with the note at the bottom
of this article can help you hit the ground running with native UI's.

#### Step 0: Add The Framework

First, we'll assume that you've added the `react-native-ui-native` framework and linked the library using the built-in
link command (like below), or done the linking by hand.

```bash
$ yarn add react-native-ui-native
$ react-native link
```

#### Step 1: Store the JS Bridge

Currently a prerequisite to `react-native-ui-native` is storing the `RCTBridge` as `self.bridge` on your AppDelegate
class...this may change with a future version, but for now... let's retain our instance of the bridge.

```diff
AppDelegate.h
@@ -0 +3 @@
  #import <UIKit/UIKit.h>
+ #import <React/RCTBridge.h>

  @interface AppDelegate : UIResponder <UIApplicationDelegate>
  
  @property (nonatomic, strong) UIWindow *window;
+ @property (nonatomic, strong) RCTBridge *bridge;
+  
  @end
```

```diff
AppDelegate.m
@@ -4 +8 @@
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
-
- RCTRootView *rootView = [[RCTRootView alloc] initWithBundleURL:jsCodeLocation
-                                                     moduleName:@"HelloWorld"
-                                              initialProperties:nil
-                                                  launchOptions:launchOptions];
+
+ RCTBridge *bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
+                                           moduleProvider:nil
+                                            launchOptions:launchOptions];
+
+ RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
+                                                  moduleName:@"HelloWorld"
+                                           initialProperties:nil];
+ self.bridge = bridge;
+
  rootView.backgroundColor = [UIColor blackColor];
```

And hey `^`, you might have already done that for other projects that use the `RCTBridge`, so things might go even
smoother in your app 👨‍💻

#### Step 2: Create the Storyboard

Next up, we're going to create the Storyboard that will be used when our app launches. You'll do this by right clicking
on folder for your project, selecting "New File...", and choosing the Storyboard file template.

![Xcode Add File]({{ site.url }}/assets/rnuin-xcode-add-file.png){:width="260px"}
![Xcode File Template]({{ site.url }}/assets/rnuin-xcode-file-template.png){:width="434px"}

(opt): If we want our storyboard to be loaded as the app launches, we can change the Xcode project configuration for our
app. From the General tab for our Target in the project configuration, scroll down to **Deployment Info**, and you
can now select our new Storyboard as the **Main Interface**. (Note: check out
[Extending Existing JS Apps](#extending-existing-js-apps) on how to use `react-native-ui-native` without changing the
root view of your app).

![Xcode Deployment Info]({{ site.url }}/assets/rnuin-xcode-deploy-info.png)

(opt): Since Xcode now manages the initial screen, we no longer want the `RCTRootView` from our original template. We
can take that out a few pieces of our `AppDelegate.m` file, since they're automatically handled by the system now.

```diff
AppDelegate.m
@@ -9 +0 @@
  jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];

  RCTBridge *bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
                                            moduleProvider:nil
                                             launchOptions:launchOptions];
-
- RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
-                                                  moduleName:@"HelloWorld"
-                                           initialProperties:nil];
  self.bridge = bridge;

- rootView.backgroundColor = [UIColor blackColor];
- self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
- UIViewController *rootViewController = [UIViewController new];
- rootViewController.view = rootView;
- self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
```

#### Step 3: Design in Interface Builder

If you run the app at this point, you'll probably just see a blank program, and a log message about your Storyboard not
having a default view controller.

Let's add it 🤓

1. Crank open `Main.storyboard`, and press `⌘⇧L` to access the Library (it's also the Home Button-like symbol at the
  top corner of the window). Add a `Split View Controller` by dragging it to the canvas.
2. Select the origin of the split views (the left-most one), and tick the `Is Initial View Controller` box for it.
  - ![Initial View Controller]({{ site.url }}/assets/rnuin-xcode-split-initial.png)
3. Select the `Navigation Bar` from the `Navigation Controller Scene` (possibly by using the canvas left items list),
  and tick the **Prefers Large Titles** option.
4. Change the title of Root View Controller to something more fun, like `Example App` by double clicking it.
5. Select the prototype cell inside the table list, and change the cell **Style** to `Basic` and set the **Reuse
Identifier** to `myCell`.
  - We'll utilize this down in Step 4.

If you run the app, you may notice that you're automatically one page nested already. Doesn't feel right. This is
because on a small-sized device, split view collapses the panels as one, and we need to tell it which half should take
priority. We can do that in our `AppDelegate.m`

```diff
AppDelegate.m
@@ -0 +4 @@
  #import <React/RCTRootView.h>

+ @interface AppDelegate () <UISplitViewControllerDelegate>
+
+ @end
+
  @implementation AppDelegate
@@ -0 +8 @@
    jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];

    RCTBridge *bridge = [[RCTBridge alloc] initWithBundleURL:jsCodeLocation
                                              moduleProvider:nil
                                               launchOptions:launchOptions];

    self.bridge = bridge;

+   UISplitViewController *rootViewController = (UISplitViewController *)self.window.rootViewController;
+   rootViewController.delegate = self;
+
    [self.window makeKeyAndVisible];
    return YES;
  }
+
+ - (BOOL)splitViewController:(UISplitViewController *)splitViewController collapseSecondaryViewController:(UIViewController *)secondaryViewController ontoPrimaryViewController:(UIViewController *)primaryViewController {
+   // Tell the system to "collapse" (i.e. discard) the secondary view when compacting to a single pane.
+   return YES;
+ }
```

Now you'll see our empty table view when the app loads, and if you pay attention, you can find the JS banner as the
`RCTBridge` prepares the JS application.

#### Step 4: Load in the JS Data

It's time to use `react-native-ui-native`. We want to render some example text in a few cells of the table via the
JavaScript app. To do this, we need a new `UITableViewController` subclass for our list.

Select the same "New File..." button as earlier, and select a Cocoa Touch Class. Change the superclass to
`UITableViewController` and give your class a name. For this example, we'll use Swift, which means we need a bridging
header for the `react-native-ui-native` library.

You'll want the Bridging Header to look like this:

```objective-c
#import <RNUINative/RNUINativeManager.h>
```

And the view controller to look like this:

```swift
import UIKit

class RNUINDemoListViewController: UITableViewController {
    private var items = [String]?
    
    override func viewDidLoad() {
        super.viewDidLoad()

        RNUINativeManager.loadData(withHandler: "MyHandler.listItems()", arguments: nil) { (data, error) in
            self.items = data as? [String]
        }
    }

    // MARK: - Table view data source

    override func numberOfSections(in tableView: UITableView) -> Int {
        return 1
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return self.items?.count ?? 0
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "myCell", for: indexPath)

        cell.textLabel?.text = self.items?[indexPath.row]

        return cell
    }
}
```

And we want to create the JS handler like this:

```js
import RNUINative from "react-native-ui-native";

class MyHandler extends RNUINative.Handler {
    listItems() {
        return ["Item One", "Item Two"];
    }
}

export default RNUINative.registerHandler('MyHandler', () => MyHandler);
```

And adding it to our `index.js` file like this:

```diff
index.js
@@ -0 +2 @@
  import {name as appName} from './app.json';

+ import "./MyHandler"
+
  AppRegistry.registerComponent(appName, () => App);
```

Now run your app. You should see your labels!

#### Bonus: Perform Native Navigation

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

Then in JS code, we can register our `NativeDocList` handler, which emits an event named `NativeDocList.launchView` when
something (like a JS button tap or background task completion) occurs in our React view.

From here, iOS will present your new storyboard as a modal, and you'll be able to build perfect view controllers for
your existing native app using Swift/Objective-C view controllers designed in Interface Builder.

Another tip: Xcode supports different Main Storyboards for the iPhone and iPad editions of your app, which means you can
launch your app using Storyboards for iPhone, but continue the existing React app when on iPad with little code change.
We just need to no-longer overwrite the initial `self.window` that is now managed by Interface Builder.

```diff
- self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
- UIViewController *rootViewController = [UIViewController new];
- rootViewController.view = rootView;
-
- self.window.rootViewControlelr = rootViewController;
-
+ if (UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad) {
+    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
+    UIViewController *rootViewController = [UIViewController new];
+    rootViewController.view = rootView;
+
+    self.window.rootViewController = rootViewController;
+ }
```

Boom 💥

### Moving Forward

I lead the development of an iPad app completely in React Native, even with my background in native iOS development.
This was the right decision at our small business so a team of JS developers could contribute without learning a new
language. We're still glad to share constants, functions and other JS code from our server & web app into the mobile
app.

But if I were making the decision again, I'd opt to use [`JSVirtualMachine()`][swift-js]'s native APIs to run the
backend of our mobile app, with a simple [Webpack][webpack] bundle. Stay tuned for a tutorial on how to do that :D

[rn]: https://facebook.github.io/react-native/
[rnuin]: https://github.com/houserater/react-native-ui-native
[ib]: https://developer.apple.com/xcode/interface-builder/
[swift-js]: https://medium.com/swift-programming/from-swift-to-javascript-and-back-fd1f6a7a9f46
[webpack]: https://webpack.js.org
