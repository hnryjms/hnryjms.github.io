---
layout: post
title:  "Custom Camera Overlay View on iPhone X"
date:   2017-12-18
summary: ""
---
The [`UIImagePickerController`][pickervc]{:target="_blank"} component on iOS bundles the best native experience for
capturing photos and videos within the iOS platform. Using frameworks like `AVFoundation` come with a lot of
boiler-plating and do-it-youself handling involved...when often, we can look at the
[`.customOverlayView`][pickervc-overlay]{:target="_blank"} property for most of our needs.

Once you build a custom view, and set `.showsCameraControls` to `false`, you may notice one issue, especially on iPhone
X and iPhone XS—the camera viewfinder is pushed far to the top of the screen, leaving black content everywhere else.

![Camera Viewfinder Shifting]({{ site.url }}/assets/ios-camera-topoffset.jpeg){:width="260px" class="image-aside"}
This is no good :( ... So what is going on here? In this example, I've rebuilt a UI that mimics the Apple system borders
on both sides of the screen. My components along the screen edges have a black background color, but I certainly did not
assign the bottom edge to be as tall as what's shown here.

To make things easier to see...I can find that the capture viewfinder is aligned all the way to the top of the screen
(including underneath the iPhone X sensor housing). That feels less-than-stellar. iOS is doing this so that the
viewfinder renders the correct aspect ratio of the image that will be captured using `UIImagePickerController`. Smart.

But that's not where I want it.

It's time for some translation. Check out the [`.cameraViewTransform`][pickervc-transform]{:target="_blank"} property.
We can apply any number of transforms onto this view, but right now we're looking for a simple `translation` to move the
viewfinder down to the center of this window.

```swift
imagePicker.cameraViewTransform = CGAffineTransformMakeTranslation(0, 120)
```

![Camera Viewfinder Aligned]({{ site.url }}/assets/ios-camera-aligned.jpeg){:width="260px" class="image-aside-right"}
And bam 🧨 we have a winner!

*Note: you'll probably want to add some device-specific handling to the translation, but I'll leave your UI design
choices out of this article*.

And now the view is centered—and hey. Instead of a black background on my edge views, I can leave them transparent, since
the system is already displaying a black underlay.

If you have any questions about this article, please leave your feedback by reaching out to me on
Twitter—[@hnryjms](https://twitter.com/hnryjms "@hnryjms on Twitter"), or give me a follow if you want to read more 💬

[pickervc]: https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIImagePickerController_Class
[pickervc-overlay]: https://developer.apple.com/documentation/uikit/uiimagepickercontroller/1619113-cameraoverlayview
[pickervc-transform]: https://developer.apple.com/documentation/uikit/uiimagepickercontroller/1619142-cameraviewtransform